import type { Metadata } from 'next'
import { CheckCircle2, Circle } from 'lucide-react'
import { requireActor } from '@/server/auth/context'
import { prisma } from '@/server/infra/prisma'
import { PageHeader } from '@/components/patterns/page-header'
import { ROLE_SEED } from '@/shared/constants/permissions'
import { businessToday, formatLong } from '@/server/domain/dates'
import { PLANS } from '@/config/placeholders'
import { formatMoney } from '@/lib/cn'
import { canSeeMoney } from '@/server/auth/rbac'

export const metadata: Metadata = { title: 'Inicio' }

/**
 * Dashboard de la Fase 1: muestra el estado real del sistema.
 * Los 13 indicadores de negocio llegan en la Fase 5, cuando existan clientes,
 * membresías y pagos que contar (docs/10-fases-desarrollo.md).
 */
export default async function DashboardPage() {
  const actor = await requireActor()

  const [userCount, roleCount, permissionCount, settingCount, auditCount] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.businessSetting.count(),
    prisma.auditLog.count(),
  ])

  const hoy = businessToday()
  const roleName = actor.roles[0] ? ROLE_SEED[actor.roles[0]].name : 'Sin rol'
  const publicPlans = PLANS.filter((p) => p.isPublic)

  const fases = [
    { done: true, label: 'Fundaciones · identidad, permisos, sesiones y auditoría' },
    { done: true, label: 'Clientes y configuración' },
    { done: false, label: 'Planes, servicios contratados y membresías' },
    { done: false, label: 'Pagos, asistencia y tarjeta del entrenador' },
  ]

  return (
    <>
      <PageHeader
        title={`Hola, ${actor.fullName.split(' ')[0]}`}
        description={`${roleName} · ${formatLong(hoy)}`}
      />

      <section aria-label="Estado del sistema" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Usuarios" value={userCount} />
        <Stat label="Roles" value={roleCount} />
        <Stat label="Permisos" value={permissionCount} />
        <Stat label="Acciones auditadas" value={auditCount} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-5">
          <h2 className="text-sm font-semibold text-[--color-text]">Catálogo cargado</h2>
          <p className="mt-1 text-xs text-[--color-text-muted]">
            Planes confirmados. Se activan en la Fase 3, cuando existan las membresías.
          </p>
          <ul className="mt-4 space-y-2">
            {publicPlans.map((plan) => (
              <li
                key={plan.slug}
                className="flex items-center justify-between gap-3 border-b border-[--color-border] pb-2 last:border-0 last:pb-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-[--color-text]">{plan.name}</span>
                  <span className="block text-xs text-[--color-text-muted]">
                    {plan.weeklyVisitLimit} días por semana
                  </span>
                </span>
                {canSeeMoney(actor) && (
                  <span className="tabular shrink-0 text-sm font-medium text-[--color-text]">
                    {formatMoney(plan.price)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-5">
          <h2 className="text-sm font-semibold text-[--color-text]">Avance del desarrollo</h2>
          <p className="mt-1 text-xs text-[--color-text-muted]">
            {settingCount} claves de configuración sembradas.
          </p>
          <ul className="mt-4 space-y-2.5">
            {fases.map((fase) => (
              <li key={fase.label} className="flex items-start gap-2.5 text-sm">
                {fase.done ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-[--color-text-subtle]" aria-hidden />
                )}
                <span className={fase.done ? 'text-[--color-text]' : 'text-[--color-text-muted]'}>
                  {fase.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-4">
      <p className="tabular text-2xl font-semibold text-[--color-text]">{value}</p>
      <p className="mt-0.5 text-xs text-[--color-text-muted]">{label}</p>
    </div>
  )
}
