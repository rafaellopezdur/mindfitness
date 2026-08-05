import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Archive, ArchiveRestore } from 'lucide-react'
import { requirePermission } from '@/server/auth/context'
import { can } from '@/server/auth/rbac'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { describePlan, getPlan, listServices } from '@/server/modules/plans/plan-service'
import { archivePlanAction } from '@/server/modules/plans/actions'
import { PLAN_STATUS_LABELS } from '@/shared/schemas/plans'
import { PageHeader } from '@/components/patterns/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/cn'
import { PlanForm } from '../plan-form'

export const metadata: Metadata = { title: 'Plan' }

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requirePermission(PERMISSIONS.PLAN_READ, `/admin/planes/${id}`)

  const [plan, services] = await Promise.all([getPlan(id), listServices()])
  if (!plan) notFound()

  const canEdit = can(actor, PERMISSIONS.PLAN_UPDATE)
  const canArchive = can(actor, PERMISSIONS.PLAN_ARCHIVE)
  const isArchived = plan.status === 'ARCHIVED'

  return (
    <>
      <PageHeader
        back={{ href: '/admin/planes', label: 'Planes' }}
        eyebrow={describePlan(plan)}
        title={plan.name}
        description={`${formatMoney(plan.effectivePrice)} · ${PLAN_STATUS_LABELS[plan.status]}`}
        actions={
          canArchive && (
            <form action={archivePlanAction}>
              <input type="hidden" name="planId" value={plan.id} />
              <input
                type="hidden"
                name="reason"
                value={isArchived ? 'Reactivado desde el panel' : 'Archivado desde el panel'}
              />
              <Button type="submit" variant={isArchived ? 'secondary' : 'ghost'} size="sm">
                {isArchived ? (
                  <>
                    <ArchiveRestore className="size-3.5" aria-hidden />
                    Reactivar
                  </>
                ) : (
                  <>
                    <Archive className="size-3.5" aria-hidden />
                    Archivar
                  </>
                )}
              </Button>
            </form>
          )
        }
      />

      {plan.activeMemberships > 0 && (
        <p className="mb-5 flex flex-wrap items-center gap-2 rounded-lg bg-info-surface px-4 py-3 text-sm text-info">
          <Badge tone="info" showIcon={false}>
            {plan.activeMemberships} {plan.activeMemberships === 1 ? 'membresía viva' : 'membresías vivas'}
          </Badge>
          <span>
            Cambiar el precio o los servicios de este plan <strong>no las afecta</strong>: cada una guarda
            sus condiciones congeladas.
          </span>
        </p>
      )}

      {isArchived && (
        <p className="mb-5 rounded-lg bg-mute-surface px-4 py-3 text-sm text-mute">
          Plan archivado: no se puede vender, pero sus membresías vivas siguen intactas.
        </p>
      )}

      {canEdit ? (
        <div className="max-w-3xl">
          <PlanForm services={services} plan={plan} />
        </div>
      ) : (
        <div className="max-w-3xl rounded-xl border border-line bg-surface p-5 shadow-flat">
          <h2 className="mb-3 text-sm font-semibold text-ink">Qué incluye</h2>
          <ul className="space-y-1.5">
            {plan.entitlements.map((entitlement) => (
              <li key={entitlement.serviceId} className="flex items-center gap-2 text-sm text-ink">
                <span aria-hidden className="text-ok">
                  ✓
                </span>
                {entitlement.serviceName}
                <span className="tabular ml-auto text-xs text-ink-faint">
                  {entitlement.quantity === null ? 'ilimitado' : entitlement.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
