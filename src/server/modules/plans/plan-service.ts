import 'server-only'
import { prisma } from '@/server/infra/prisma'
import { businessToday, fromUtcAnchor, type BusinessDate } from '@/server/domain/dates'
import { effectivePrice } from '@/server/domain/memberships'

/**
 * Lectura de planes.
 *
 * Los importes se guardan como BigInt (ADR-0002) y BigInt no cruza la frontera
 * de los React Server Components: se convierte a `number` aquí, en el borde,
 * y no en cada pantalla.
 */

export interface PlanEntitlementView {
  serviceId: string
  serviceCode: string
  serviceName: string
  requiresTrainer: boolean
  quantity: number | null
  period: 'TOTAL' | 'DAY' | 'WEEK' | 'MONTH'
  rollover: boolean
}

export interface PlanView {
  id: string
  slug: string
  name: string
  description: string | null
  price: number
  effectivePrice: number
  hasPromo: boolean
  durationValue: number | null
  durationUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null
  sessionLimit: number | null
  weeklyVisitLimit: number | null
  dailyVisitLimit: number
  modality: 'OPEN' | 'GROUP' | 'SEMI_PERSONAL' | 'PERSONAL'
  requiresSchedule: boolean
  maxCapacity: number | null
  graceDays: number
  isPublic: boolean
  isRecommended: boolean
  allowsOnlineRegistration: boolean
  allowsDiscount: boolean
  status: 'DRAFT' | 'ACTIVE' | 'HIDDEN' | 'ARCHIVED'
  benefits: string[]
  sortOrder: number
  entitlements: PlanEntitlementView[]
  activeMemberships: number
}

type PlanRow = Awaited<ReturnType<typeof loadPlans>>[number]

async function loadPlans(where: Record<string, unknown>) {
  return prisma.plan.findMany({
    where,
    include: {
      entitlements: { include: { service: true } },
      _count: { select: { memberships: { where: { status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } } } } },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
}

function toView(plan: PlanRow, today: BusinessDate): PlanView {
  const price = Number(plan.price)
  const promoPrice = plan.promoPrice === null ? null : Number(plan.promoPrice)

  const current = effectivePrice(
    {
      price,
      promoPrice,
      promoStartsAt: plan.promoStartsAt ? fromUtcAnchor(plan.promoStartsAt) : null,
      promoEndsAt: plan.promoEndsAt ? fromUtcAnchor(plan.promoEndsAt) : null,
    },
    today,
  )

  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    price,
    effectivePrice: current,
    hasPromo: current !== price,
    durationValue: plan.durationValue,
    durationUnit: plan.durationUnit,
    sessionLimit: plan.sessionLimit,
    weeklyVisitLimit: plan.weeklyVisitLimit,
    dailyVisitLimit: plan.dailyVisitLimit,
    modality: plan.modality,
    requiresSchedule: plan.requiresSchedule,
    maxCapacity: plan.maxCapacity,
    graceDays: plan.graceDays,
    isPublic: plan.isPublic,
    isRecommended: plan.isRecommended,
    allowsOnlineRegistration: plan.allowsOnlineRegistration,
    allowsDiscount: plan.allowsDiscount,
    status: plan.status,
    benefits: Array.isArray(plan.benefits) ? (plan.benefits as string[]) : [],
    sortOrder: plan.sortOrder,
    activeMemberships: plan._count.memberships,
    entitlements: plan.entitlements.map((entitlement) => ({
      serviceId: entitlement.serviceId,
      serviceCode: entitlement.service.code,
      serviceName: entitlement.service.name,
      requiresTrainer: entitlement.service.requiresTrainer,
      quantity: entitlement.quantity,
      period: entitlement.period,
      rollover: entitlement.rollover,
    })),
  }
}

export async function listPlans(options: { includeArchived?: boolean } = {}): Promise<PlanView[]> {
  const today = businessToday()
  const plans = await loadPlans({
    deletedAt: null,
    ...(options.includeArchived ? {} : { status: { not: 'ARCHIVED' } }),
  })
  return plans.map((plan) => toView(plan, today))
}

export async function getPlan(id: string): Promise<PlanView | null> {
  const today = businessToday()
  const plans = await loadPlans({ id })
  const plan = plans[0]
  return plan ? toView(plan, today) : null
}

/** Planes que se pueden vender hoy: los archivados no (RN-10). */
export async function sellablePlans(): Promise<PlanView[]> {
  const today = businessToday()
  const plans = await loadPlans({ deletedAt: null, status: { in: ['ACTIVE', 'HIDDEN'] } })
  return plans.map((plan) => toView(plan, today))
}

export async function listServices() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  return services.map((service) => ({
    id: service.id,
    code: service.code,
    name: service.name,
    description: service.description,
    unit: service.unit,
    requiresTrainer: service.requiresTrainer,
  }))
}

/** Resumen legible de las reglas de un plan, para listados y tarjetas. */
export function describePlan(plan: PlanView): string {
  const parts: string[] = []

  if (plan.durationValue && plan.durationUnit) {
    const unit = { DAY: 'día', WEEK: 'semana', MONTH: 'mes', YEAR: 'año' }[plan.durationUnit]
    parts.push(plan.durationValue === 1 ? `1 ${unit}` : `${plan.durationValue} ${unit}s`)
  }
  if (plan.sessionLimit) parts.push(`${plan.sessionLimit} sesiones`)
  if (plan.weeklyVisitLimit) parts.push(`${plan.weeklyVisitLimit} días por semana`)

  return parts.join(' · ') || 'Sin reglas de vigencia'
}

/** Slug a partir del nombre, único dentro de los planes existentes. */
export async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'plan'

  for (let suffix = 0; suffix < 50; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`
    const existing = await prisma.plan.findUnique({ where: { slug: candidate } })
    if (!existing || existing.id === excludeId) return candidate
  }
  return `${base}-${Date.now()}`
}
