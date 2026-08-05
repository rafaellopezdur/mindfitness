import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CalendarClock,
  ClipboardCheck,
  Rocket,
  ScanLine,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { requireActor } from '@/server/auth/context'
import { can, canSeeMoney } from '@/server/auth/rbac'
import { PERMISSIONS, ROLE_SEED } from '@/shared/constants/permissions'
import { prisma } from '@/server/infra/prisma'
import { businessToday, formatLong } from '@/server/domain/dates'
import { PLANS } from '@/config/placeholders'
import { getBusinessInfo } from '@/server/modules/settings/settings-service'
import { PageHeader } from '@/components/patterns/page-header'
import { MetricGroup } from '@/components/patterns/metric-group'
import { EmptyState } from '@/components/patterns/empty-state'
import { Badge } from '@/components/ui/badge'
import { cn, formatMoney } from '@/lib/cn'

export const metadata: Metadata = { title: 'Inicio' }

/**
 * Inicio.
 *
 * Responde, en este orden: qué día es y quién eres · qué requiere atención hoy ·
 * qué puedes hacer desde aquí. Los indicadores de negocio (clientes activos,
 * cartera, vencimientos) llegan en las Fases 3 y 4, cuando existan membresías
 * y pagos que contar: mientras tanto se dice con franqueza en lugar de rellenar
 * con cifras decorativas.
 */
export default async function DashboardPage() {
  const actor = await requireActor()
  const isTrainer = actor.roles[0] === 'TRAINER'

  // Dos consultas en paralelo: una ida y vuelta, no dos (ADR-0006).
  const [counts, business] = await Promise.all([
    Promise.all([
      prisma.client.count({ where: { deletedAt: null, mergedIntoId: null } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      prisma.client.count({
        where: {
          deletedAt: null,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]),
    getBusinessInfo(),
  ])

  const [clients, teamMembers, newClients] = counts
  const today = businessToday()
  const firstName = actor.fullName.split(' ')[0]
  const roleName = actor.roles[0] ? ROLE_SEED[actor.roles[0]].name : 'Sin rol'

  const hour = Number(
    new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false }).format(
      new Date(),
    ),
  )
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <>
      <PageHeader
        eyebrow={formatLong(today)}
        title={`${greeting}, ${firstName}`}
        description={`${roleName} · ${business.name}`}
      />

      {isTrainer ? <TrainerHome /> : <AdminHome clients={clients} team={teamMembers} nuevos={newClients} actor={actor} />}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Inicio de administración
   ───────────────────────────────────────────────────────────────────────── */

async function AdminHome({
  clients,
  team,
  nuevos,
  actor,
}: {
  clients: number
  team: number
  nuevos: number
  actor: Awaited<ReturnType<typeof requireActor>>
}) {
  const showMoney = canSeeMoney(actor)
  const publicPlans = PLANS.filter((plan) => plan.isPublic)

  const quickActions = [
    { href: '/admin/clientes/nuevo', label: 'Registrar cliente', icon: UserPlus, permission: PERMISSIONS.CLIENT_CREATE },
    { href: '/admin/clientes', label: 'Buscar cliente', icon: Users, permission: PERMISSIONS.CLIENT_READ },
    { href: '/admin/usuarios', label: 'Equipo', icon: ClipboardCheck, permission: PERMISSIONS.USER_READ },
  ].filter((action) => can(actor, action.permission))

  return (
    <div className="space-y-5">
      <MetricGroup
        title="El club hoy"
        metrics={[
          { label: 'Clientes registrados', value: clients, href: '/admin/clientes' },
          { label: 'Nuevos este mes', value: nuevos, note: 'últimos 30 días' },
          { label: 'Equipo activo', value: team, href: '/admin/usuarios' },
          { label: 'Planes publicados', value: publicPlans.length },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {/* Acciones rápidas: lo que se hace veinte veces al día. */}
        <section className="rounded-xl border border-line bg-surface p-5 shadow-flat">
          <h2 className="eyebrow mb-3">Acciones rápidas</h2>
          <div className="stagger grid gap-2 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href as never}
                className={cn(
                  'press group flex items-center gap-3 rounded-lg border border-line p-3',
                  'transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50',
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 transition-colors duration-150 group-hover:bg-brand-100">
                  <action.icon className="size-4" aria-hidden />
                </span>
                <span className="text-sm font-medium text-ink">{action.label}</span>
              </Link>
            ))}
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <p className="eyebrow mb-2">Próximamente</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { icon: Wallet, label: 'Registrar pago' },
                { icon: ScanLine, label: 'Marcar asistencia' },
                { icon: CalendarClock, label: 'Ver agenda' },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-1 text-xs text-ink-faint"
                >
                  <item.icon className="size-3" aria-hidden />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Catálogo: lo único con cifras reales de negocio hoy. */}
        <section className="rounded-xl border border-line bg-surface shadow-flat">
          <header className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="eyebrow">Catálogo</h2>
            <Badge tone="brand" showIcon={false}>
              {publicPlans.length} planes
            </Badge>
          </header>
          <ul className="stagger divide-y divide-line">
            {publicPlans.map((plan) => (
              <li key={plan.slug} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{plan.name}</span>
                    {plan.isRecommended && (
                      <Badge tone="brand" size="sm" showIcon={false}>
                        Recomendado
                      </Badge>
                    )}
                  </span>
                  <span className="block text-xs text-ink-soft">
                    {plan.weeklyVisitLimit} días por semana
                  </span>
                </span>
                {showMoney && (
                  <span className="numeral shrink-0 text-base text-ink">{formatMoney(plan.price)}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Roadmap />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Inicio del entrenador
   Pantalla distinta, no una versión recortada. Sin una sola cifra de dinero.
   ───────────────────────────────────────────────────────────────────────── */

function TrainerHome() {
  return (
    <div className="space-y-5">
      <section className="accent-rule rounded-xl border border-line bg-surface py-5 pl-5 pr-5 shadow-flat">
        <div className="pl-3">
          <h2 className="text-sm font-semibold text-ink">Tu día</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Aquí verás tus franjas de hoy, quién se espera en cada una y las autorizaciones que pediste.
          </p>
        </div>
      </section>

      <EmptyState
        variant="soon"
        icon={CalendarClock}
        title="Tu agenda llega en la Fase 3"
        description="Necesita que existan los horarios y las asignaciones. Cuando esté, esta pantalla abrirá directamente en tus franjas del día."
      />

      <EmptyState
        variant="soon"
        icon={ScanLine}
        title="La tarjeta de acceso llega en la Fase 4"
        description="Buscarás por documento y verás en menos de tres segundos qué tiene contratado la persona: si incluye acompañamiento, cuántas sesiones le quedan y en qué horarios."
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Avance del desarrollo
   ───────────────────────────────────────────────────────────────────────── */

const PHASES = [
  { done: true, label: 'Fundaciones', detail: 'Identidad, permisos, sesiones y auditoría' },
  { done: true, label: 'Clientes y configuración', detail: 'Fichas, búsqueda y reglas del negocio' },
  { done: false, label: 'Planes y membresías', detail: 'Servicios contratados y contratos' },
  { done: false, label: 'Pagos y asistencia', detail: 'Cobros, check-in y tarjeta del entrenador' },
]

function Roadmap() {
  const done = PHASES.filter((phase) => phase.done).length
  const progress = Math.round((done / PHASES.length) * 100)

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-flat">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="eyebrow flex items-center gap-1.5">
          <Rocket className="size-3.5" aria-hidden />
          Avance del desarrollo
        </h2>
        <span className="numeral text-sm text-ink-soft">{progress}%</span>
      </div>

      {/* La barra se anima al entrar: el ancho se escala con `transform`,
          que no provoca reflow. */}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full origin-left rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-transform duration-700 ease-out"
          style={{ transform: `scaleX(${progress / 100})`, width: '100%' }}
        />
      </div>

      <ol className="stagger space-y-2.5">
        {PHASES.map((phase) => (
          <li key={phase.label} className="flex items-start gap-3">
            <span
              aria-hidden
              className={cn(
                'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-2xs font-bold',
                phase.done ? 'bg-ok-surface text-ok' : 'bg-sunken text-ink-faint',
              )}
            >
              {phase.done ? '✓' : '·'}
            </span>
            <span className="min-w-0">
              <span className={cn('block text-sm', phase.done ? 'text-ink' : 'text-ink-soft')}>
                {phase.label}
              </span>
              <span className="block text-xs text-ink-faint">{phase.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
