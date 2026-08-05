import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Gift, Pause, Play, RefreshCw, XCircle } from 'lucide-react'
import { requirePermission } from '@/server/auth/context'
import { can } from '@/server/auth/rbac'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { prisma } from '@/server/infra/prisma'
import {
  getMembership,
  MEMBERSHIP_STATE_LABELS,
  type DerivedMembershipState,
} from '@/server/modules/memberships/membership-service'
import {
  activateMembershipAction,
  addCourtesyAction,
  cancelMembershipAction,
  pauseMembershipAction,
  renewMembershipAction,
  resumeMembershipAction,
} from '@/server/modules/memberships/actions'
import { daysRemaining, formatLong } from '@/server/domain/dates'
import { PageHeader } from '@/components/patterns/page-header'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatDateTime, formatMoney } from '@/lib/cn'

export const metadata: Metadata = { title: 'Membresía' }

const STATE_TONE: Record<DerivedMembershipState, BadgeTone> = {
  PENDING: 'warn',
  ACTIVE: 'ok',
  EXPIRING_SOON: 'warn',
  IN_GRACE: 'warn',
  EXPIRED: 'risk',
  PAUSED: 'mute',
  COMPLETED: 'mute',
  CANCELLED: 'mute',
  SUPERSEDED: 'mute',
}

const PERIOD_LABEL: Record<string, string> = {
  TOTAL: 'en total',
  DAY: 'al día',
  WEEK: 'por semana',
  MONTH: 'al mes',
}

export default async function MembershipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requirePermission(PERMISSIONS.MEMBERSHIP_READ, `/admin/membresias/${id}`)

  const [membership, changes] = await Promise.all([
    getMembership(id),
    prisma.membershipChange.findMany({
      where: { membershipId: id },
      orderBy: { performedAt: 'desc' },
      take: 20,
    }),
  ])
  if (!membership) notFound()

  const isPending = membership.status === 'PENDING'
  const isActive = membership.status === 'ACTIVE'
  const isPaused = membership.status === 'PAUSED'
  const isClosed = ['CANCELLED', 'SUPERSEDED'].includes(membership.status)

  return (
    <>
      <PageHeader
        back={{ href: '/admin/membresias', label: 'Membresías' }}
        eyebrow={membership.planName}
        title={membership.clientName}
        description={membership.clientDocument}
        actions={
          <Link
            href={`/admin/clientes/${membership.clientId}` as Route}
            className="text-sm text-brand-700 hover:underline"
          >
            Ver ficha del cliente
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          {/* Estado y vigencia */}
          <section className="rounded-xl border border-line bg-surface p-5 shadow-flat">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge tone={STATE_TONE[membership.state]} size="md">
                {MEMBERSHIP_STATE_LABELS[membership.state]}
              </Badge>
              <span className="numeral text-xl text-ink">{formatMoney(membership.finalPrice)}</span>
            </div>

            <dl className="mt-4 space-y-2 border-t border-line pt-4">
              <Row label="Inicio" value={formatLong(membership.startDate)} />
              {membership.endDate ? (
                <>
                  <Row label="Vencimiento" value={formatLong(membership.endDate)} />
                  <Row
                    label="Días restantes"
                    value={
                      daysRemaining(membership.endDate) >= 0
                        ? `${daysRemaining(membership.endDate)} días`
                        : `vencida hace ${Math.abs(daysRemaining(membership.endDate))} días`
                    }
                  />
                </>
              ) : (
                <Row label="Vencimiento" value="Sin vencimiento por fecha" />
              )}
              {membership.discountAmount > 0 && (
                <Row
                  label="Descuento"
                  value={`${formatMoney(membership.discountAmount)} sobre ${formatMoney(membership.listPrice)}`}
                />
              )}
              {membership.graceDays > 0 && <Row label="Gracia" value={`${membership.graceDays} días`} />}
            </dl>
          </section>

          {/* Derechos: lo que de verdad tiene contratado */}
          <section className="rounded-xl border border-line bg-surface p-5 shadow-flat">
            <h2 className="eyebrow mb-3">Qué tiene contratado</h2>
            {membership.entitlements.length === 0 ? (
              <p className="text-sm text-warn">
                Sin servicios declarados. El plan se vendió sin derechos: no se puede saber qué incluye.
              </p>
            ) : (
              <ul className="space-y-3">
                {membership.entitlements.map((entitlement) => {
                  const unlimited = entitlement.quantityTotal === null
                  const remaining = unlimited
                    ? null
                    : Math.max(0, entitlement.quantityTotal! - entitlement.quantityUsed)
                  const ratio = unlimited ? 1 : entitlement.quantityUsed / entitlement.quantityTotal!

                  return (
                    <li key={entitlement.serviceCode}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2 text-ink">
                          <span aria-hidden className="text-ok">
                            ✓
                          </span>
                          <span className="truncate">{entitlement.serviceName}</span>
                        </span>
                        <span className="tabular shrink-0 text-xs text-ink-soft">
                          {unlimited
                            ? 'ilimitado'
                            : `${remaining} de ${entitlement.quantityTotal} ${PERIOD_LABEL[entitlement.period]}`}
                        </span>
                      </div>
                      {!unlimited && (
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sunken">
                          <div
                            className={cn(
                              'h-full origin-left rounded-full transition-transform duration-500 ease-out',
                              ratio >= 1 ? 'bg-risk' : ratio > 0.7 ? 'bg-warn' : 'bg-brand-500',
                            )}
                            style={{ transform: `scaleX(${Math.min(1, ratio)})`, width: '100%' }}
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Historial del contrato */}
          <section className="rounded-xl border border-line bg-surface p-5 shadow-flat">
            <h2 className="eyebrow mb-3">Historial</h2>
            {changes.length === 0 ? (
              <p className="text-sm text-ink-soft">Sin cambios registrados.</p>
            ) : (
              <ol className="space-y-2.5">
                {changes.map((change) => (
                  <li key={change.id} className="border-l-2 border-line pl-3">
                    <p className="text-sm text-ink">{change.action}</p>
                    <p className="text-xs text-ink-soft">{formatDateTime(change.performedAt)}</p>
                    {change.reason && <p className="mt-0.5 text-xs text-ink-faint">{change.reason}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Acciones */}
        <aside className="space-y-3">
          {isPending && can(actor, PERMISSIONS.MEMBERSHIP_CREATE) && (
            <ActionCard
              title="Activar"
              description="El módulo de pagos llega en la Fase 4. Hasta entonces la activación es manual y queda auditada."
            >
              <form action={activateMembershipAction}>
                <input type="hidden" name="membershipId" value={membership.id} />
                <Button type="submit" block>
                  <CheckCircle2 className="size-4" aria-hidden />
                  Activar membresía
                </Button>
              </form>
            </ActionCard>
          )}

          {isActive && can(actor, PERMISSIONS.MEMBERSHIP_PAUSE) && (
            <ActionCard title="Pausar" description="El reloj se detiene y los días se devuelven al reactivar.">
              <form action={pauseMembershipAction} className="space-y-2">
                <input type="hidden" name="membershipId" value={membership.id} />
                <input
                  name="reason"
                  required
                  minLength={5}
                  placeholder="Motivo (viaje, lesión…)"
                  className="h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
                />
                <Button type="submit" variant="secondary" size="sm" block>
                  <Pause className="size-3.5" aria-hidden />
                  Pausar
                </Button>
              </form>
            </ActionCard>
          )}

          {isPaused && can(actor, PERMISSIONS.MEMBERSHIP_RESUME) && (
            <ActionCard title="Reactivar" description="El vencimiento se correrá los días que estuvo pausada.">
              <form action={resumeMembershipAction}>
                <input type="hidden" name="membershipId" value={membership.id} />
                <Button type="submit" block>
                  <Play className="size-4" aria-hidden />
                  Reactivar
                </Button>
              </form>
            </ActionCard>
          )}

          {!isClosed && can(actor, PERMISSIONS.MEMBERSHIP_RENEW) && (
            <ActionCard
              title="Renovar"
              description="Crea una membresía nueva encadenada. Si aún está vigente, no se pierde ni un día."
            >
              <form action={renewMembershipAction}>
                <input type="hidden" name="membershipId" value={membership.id} />
                <Button type="submit" variant="secondary" size="sm" block>
                  <RefreshCw className="size-3.5" aria-hidden />
                  Renovar
                </Button>
              </form>
            </ActionCard>
          )}

          {membership.endDate && can(actor, PERMISSIONS.MEMBERSHIP_COURTESY_DAYS) && (
            <ActionCard title="Días de cortesía" description="Se suman al vencimiento y quedan auditados.">
              <form action={addCourtesyAction} className="space-y-2">
                <input type="hidden" name="membershipId" value={membership.id} />
                <div className="flex gap-2">
                  <input
                    name="days"
                    type="number"
                    min={1}
                    required
                    placeholder="Días"
                    className="h-10 w-20 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
                  />
                  <input
                    name="reason"
                    required
                    minLength={5}
                    placeholder="Motivo"
                    className="h-10 flex-1 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
                  />
                </div>
                <Button type="submit" variant="ghost" size="sm" block>
                  <Gift className="size-3.5" aria-hidden />
                  Añadir
                </Button>
              </form>
            </ActionCard>
          )}

          {!isClosed && can(actor, PERMISSIONS.MEMBERSHIP_CANCEL) && (
            <ActionCard title="Cancelar" description="No se borra: queda registrada con su motivo.">
              <form action={cancelMembershipAction} className="space-y-2">
                <input type="hidden" name="membershipId" value={membership.id} />
                <input
                  name="reason"
                  required
                  minLength={5}
                  placeholder="Motivo de la cancelación"
                  className="h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
                />
                <Button type="submit" variant="ghost" size="sm" block className="text-risk">
                  <XCircle className="size-3.5" aria-hidden />
                  Cancelar membresía
                </Button>
              </form>
            </ActionCard>
          )}
        </aside>
      </div>
    </>
  )
}

function ActionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-flat">
      <h2 className="text-sm font-medium text-ink">{title}</h2>
      <p className="mb-3 mt-0.5 text-xs text-ink-soft">{description}</p>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="tabular text-sm text-ink">{value}</dd>
    </div>
  )
}
