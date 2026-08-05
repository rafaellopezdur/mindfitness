import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { Copy, Plus, Sparkles, Tag } from 'lucide-react'
import { requirePermission } from '@/server/auth/context'
import { can } from '@/server/auth/rbac'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { describePlan, listPlans } from '@/server/modules/plans/plan-service'
import { MODALITY_LABELS, PLAN_STATUS_LABELS } from '@/shared/schemas/plans'
import { PageHeader } from '@/components/patterns/page-header'
import { EmptyState } from '@/components/patterns/empty-state'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button, buttonClass } from '@/components/ui/button'
import { duplicatePlanAction } from '@/server/modules/plans/actions'
import { cn, formatMoney } from '@/lib/cn'

export const metadata: Metadata = { title: 'Planes' }

const STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: 'ok',
  DRAFT: 'mute',
  HIDDEN: 'info',
  ARCHIVED: 'mute',
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ archivados?: string }>
}) {
  const actor = await requirePermission(PERMISSIONS.PLAN_READ, '/admin/planes')
  const { archivados } = await searchParams
  const includeArchived = archivados === '1'

  const plans = await listPlans({ includeArchived })
  const canCreate = can(actor, PERMISSIONS.PLAN_CREATE)
  const canDuplicate = can(actor, PERMISSIONS.PLAN_DUPLICATE)

  return (
    <>
      <PageHeader
        title="Planes"
        description="El producto. Cada plan se construye combinando reglas, no eligiendo un tipo."
        actions={
          canCreate && (
            <Link href="/admin/planes/nuevo" className={buttonClass()}>
              <Plus className="size-4" aria-hidden />
              Nuevo plan
            </Link>
          )
        }
      />

      <div className="mb-5 flex gap-2">
        <Link
          href="/admin/planes"
          className={cn(
            'rounded-full border px-3 py-1 text-xs transition-colors duration-150',
            !includeArchived
              ? 'border-brand-500 bg-brand-50 font-medium text-brand-700'
              : 'border-line-strong text-ink-soft hover:bg-sunken',
          )}
        >
          Vigentes
        </Link>
        <Link
          href={'/admin/planes?archivados=1' as Route}
          className={cn(
            'rounded-full border px-3 py-1 text-xs transition-colors duration-150',
            includeArchived
              ? 'border-brand-500 bg-brand-50 font-medium text-brand-700'
              : 'border-line-strong text-ink-soft hover:bg-sunken',
          )}
        >
          Incluir archivados
        </Link>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Todavía no hay planes"
          description="Un plan es el producto que se vende. Define su precio, cuánto dura y qué servicios incluye."
          action={
            canCreate && (
              <Link href="/admin/planes/nuevo" className={buttonClass()}>
                Crear el primer plan
              </Link>
            )
          }
        />
      ) : (
        <ul className="stagger grid gap-3 lg:grid-cols-2">
          {plans.map((plan) => (
            <li key={plan.id}>
              <article
                className={cn(
                  'group h-full rounded-xl border bg-surface p-5 shadow-flat',
                  'transition-colors duration-150 hover:border-brand-200',
                  plan.isRecommended ? 'border-brand-300' : 'border-line',
                  plan.status === 'ARCHIVED' && 'opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/admin/planes/${plan.id}` as Route} className="block">
                      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                        <span className="truncate">{plan.name}</span>
                        {plan.isRecommended && (
                          <Sparkles className="size-4 shrink-0 text-brand-500" aria-label="Recomendado" />
                        )}
                      </h2>
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-soft">{describePlan(plan)}</p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="numeral text-lg text-ink">{formatMoney(plan.effectivePrice)}</p>
                    {plan.hasPromo && (
                      <p className="tabular text-2xs text-ink-faint line-through">{formatMoney(plan.price)}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone={STATUS_TONE[plan.status] ?? 'mute'}>{PLAN_STATUS_LABELS[plan.status]}</Badge>
                  <Badge tone="mute" showIcon={false}>
                    {MODALITY_LABELS[plan.modality]}
                  </Badge>
                  {plan.isPublic && (
                    <Badge tone="info" showIcon={false}>
                      En la web
                    </Badge>
                  )}
                  {plan.activeMemberships > 0 && (
                    <Badge tone="brand" showIcon={false}>
                      {plan.activeMemberships} {plan.activeMemberships === 1 ? 'membresía' : 'membresías'}
                    </Badge>
                  )}
                </div>

                {/* Lo que incluye: la información que hace útil al plan. */}
                <ul className="mt-4 space-y-1.5 border-t border-line pt-3">
                  {plan.entitlements.length === 0 ? (
                    <li className="text-xs text-warn">
                      Sin servicios declarados · no se puede saber qué incluye
                    </li>
                  ) : (
                    plan.entitlements.map((entitlement) => (
                      <li key={entitlement.serviceId} className="flex items-center gap-2 text-xs text-ink">
                        <span aria-hidden className="text-ok">
                          ✓
                        </span>
                        <span className="truncate">{entitlement.serviceName}</span>
                        <span className="tabular ml-auto shrink-0 text-ink-faint">
                          {entitlement.quantity === null
                            ? 'ilimitado'
                            : `${entitlement.quantity} ${
                                { TOTAL: 'en total', DAY: 'al día', WEEK: 'por semana', MONTH: 'al mes' }[
                                  entitlement.period
                                ]
                              }`}
                        </span>
                      </li>
                    ))
                  )}
                </ul>

                <div className="mt-4 flex gap-2">
                  <Link href={`/admin/planes/${plan.id}` as Route} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                    Abrir
                  </Link>
                  {canDuplicate && (
                    <form action={duplicatePlanAction}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        <Copy className="size-3.5" aria-hidden />
                        Duplicar
                      </Button>
                    </form>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
