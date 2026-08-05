import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma, type Db } from '@/server/infra/prisma'
import {
  businessToday,
  fromUtcAnchor,
  isExpired,
  isExpiringSoon,
  isInGrace,
  toUtcAnchor,
  type BusinessDate,
} from '@/server/domain/dates'
import {
  materializeEntitlements,
  membershipEndDate,
  type EntitlementRule,
} from '@/server/domain/memberships'
import { getRules } from '@/server/modules/settings/settings-service'

/**
 * Membresías: la aplicación de un plan a una persona.
 *
 * Al crearla se congela `planSnapshot` y se materializan los derechos DENTRO
 * de la misma transacción (RN-121). Desde ese momento, tocar el plan no altera
 * lo vendido.
 */

export type DerivedMembershipState =
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'IN_GRACE'
  | 'EXPIRED'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'SUPERSEDED'

export const MEMBERSHIP_STATE_LABELS: Record<DerivedMembershipState, string> = {
  PENDING: 'Pendiente',
  ACTIVE: 'Activa',
  EXPIRING_SOON: 'Próxima a vencer',
  IN_GRACE: 'En gracia',
  EXPIRED: 'Vencida',
  PAUSED: 'Pausada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  SUPERSEDED: 'Reemplazada',
}

/**
 * ADR-0003 · El estado visible se DERIVA del calendario.
 * Una membresía con `endDate` en el pasado está vencida aunque su columna
 * `status` siga diciendo ACTIVE porque el job no ha corrido.
 */
export function deriveState(
  membership: { status: string; endDate: Date | null; graceDays: number },
  options: { today?: BusinessDate; expiringSoonDays: number },
): DerivedMembershipState {
  const today = options.today ?? businessToday()
  const end = membership.endDate ? fromUtcAnchor(membership.endDate) : null

  switch (membership.status) {
    case 'PAUSED':
      return 'PAUSED'
    case 'CANCELLED':
      return 'CANCELLED'
    case 'SUPERSEDED':
      return 'SUPERSEDED'
    case 'COMPLETED':
      return 'COMPLETED'
    case 'PENDING':
      return 'PENDING'
  }

  if (!end) return 'ACTIVE'
  if (isExpired(end, today)) {
    return isInGrace(end, membership.graceDays, today) ? 'IN_GRACE' : 'EXPIRED'
  }
  return isExpiringSoon(end, options.expiringSoonDays, today) ? 'EXPIRING_SOON' : 'ACTIVE'
}

export interface MembershipView {
  id: string
  clientId: string
  clientName: string
  clientDocument: string
  planName: string
  finalPrice: number
  listPrice: number
  discountAmount: number
  startDate: BusinessDate
  endDate: BusinessDate | null
  sessionsIncluded: number | null
  sessionsUsed: number
  status: string
  state: DerivedMembershipState
  graceDays: number
  entitlements: {
    serviceCode: string
    serviceName: string
    quantityTotal: number | null
    quantityUsed: number
    period: string
    status: string
  }[]
}

const membershipInclude = {
  plan: { select: { name: true, graceDays: true } },
  entitlements: { include: { service: { select: { code: true, name: true } } } },
} satisfies Prisma.MembershipInclude

type Row = Prisma.MembershipGetPayload<{ include: typeof membershipInclude }>

function toView(
  membership: Row,
  client: { firstName: string; lastName: string; documentType: string; documentNumber: string },
  expiringSoonDays: number,
): MembershipView {
  const snapshot = membership.planSnapshot as { graceDays?: number } | null
  const graceDays = snapshot?.graceDays ?? membership.plan.graceDays

  return {
    id: membership.id,
    clientId: membership.clientId,
    clientName: `${client.firstName} ${client.lastName}`,
    clientDocument: `${client.documentType} ${client.documentNumber}`,
    planName: membership.plan.name,
    finalPrice: Number(membership.finalPrice),
    listPrice: Number(membership.listPrice),
    discountAmount: Number(membership.discountAmount),
    startDate: fromUtcAnchor(membership.startDate),
    endDate: membership.endDate ? fromUtcAnchor(membership.endDate) : null,
    sessionsIncluded: membership.sessionsIncluded,
    sessionsUsed: membership.sessionsUsed,
    status: membership.status,
    state: deriveState({ ...membership, graceDays }, { expiringSoonDays }),
    graceDays,
    entitlements: membership.entitlements.map((entitlement) => ({
      serviceCode: entitlement.service.code,
      serviceName: entitlement.service.name,
      quantityTotal: entitlement.quantityTotal,
      quantityUsed: entitlement.quantityUsed,
      period: entitlement.period,
      status: entitlement.status,
    })),
  }
}

export async function listMemberships(params: { estado?: string; clientId?: string } = {}) {
  const rules = await getRules()
  const today = businessToday()

  const where: Prisma.MembershipWhereInput = {}
  if (params.clientId) where.clientId = params.clientId

  // Los filtros por estado derivado se traducen a condiciones de fecha: no hay
  // una columna «vencida» que consultar, y eso es deliberado.
  switch (params.estado) {
    case 'ACTIVAS':
      where.status = 'ACTIVE'
      where.OR = [{ endDate: null }, { endDate: { gte: toUtcAnchor(today) } }]
      break
    case 'POR_VENCER':
      where.status = 'ACTIVE'
      where.endDate = {
        gte: toUtcAnchor(today),
        lte: toUtcAnchor(businessToday()),
      }
      break
    case 'VENCIDAS':
      where.status = { in: ['ACTIVE', 'EXPIRED'] }
      where.endDate = { lt: toUtcAnchor(today) }
      break
    case 'PAUSADAS':
      where.status = 'PAUSED'
      break
    case 'PENDIENTES':
      where.status = 'PENDING'
      break
  }

  const memberships = await prisma.membership.findMany({
    where,
    include: membershipInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const clientIds = [...new Set(memberships.map((membership) => membership.clientId))]
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true },
  })
  const byId = new Map(clients.map((client) => [client.id, client]))

  return memberships.flatMap((membership) => {
    const client = byId.get(membership.clientId)
    if (!client) return []
    return [toView(membership, client, rules.expiringSoonDays)]
  })
}

export async function getMembership(id: string): Promise<MembershipView | null> {
  const rules = await getRules()
  const membership = await prisma.membership.findUnique({ where: { id }, include: membershipInclude })
  if (!membership) return null

  const client = await prisma.client.findUnique({
    where: { id: membership.clientId },
    select: { firstName: true, lastName: true, documentType: true, documentNumber: true },
  })
  if (!client) return null

  return toView(membership, client, rules.expiringSoonDays)
}

/** La membresía viva de un cliente, si la hay (RN-20: como máximo una). */
export async function activeMembershipOf(clientId: string): Promise<MembershipView | null> {
  const rules = await getRules()
  const membership = await prisma.membership.findFirst({
    where: { clientId, status: { in: ['PENDING', 'ACTIVE', 'PAUSED'] } },
    include: membershipInclude,
    orderBy: { createdAt: 'desc' },
  })
  if (!membership) return null

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { firstName: true, lastName: true, documentType: true, documentNumber: true },
  })
  if (!client) return null

  return toView(membership, client, rules.expiringSoonDays)
}

export interface CreateMembershipData {
  clientId: string
  planId: string
  startDate: BusinessDate
  discountAmount: number
  discountReason?: string
  trainerId?: string | null
  scheduleSlotId?: string | null
  notes?: string
  source?: 'WEB' | 'ONSITE' | 'IMPORT' | 'RENEWAL'
  previousMembershipId?: string
  createdBy: string
}

/**
 * Crea la membresía congelando el plan y materializando sus derechos.
 * Se ejecuta dentro de una transacción para que no pueda existir una membresía
 * sin sus derechos: sería una membresía de la que nadie sabe qué incluye.
 */
export async function createMembershipInTx(tx: Db, data: CreateMembershipData) {
  const plan = await tx.plan.findUniqueOrThrow({
    where: { id: data.planId },
    include: { entitlements: { include: { service: true } } },
  })

  const listPrice = Number(plan.price)
  const finalPrice = Math.max(0, listPrice - data.discountAmount)

  const endDate = membershipEndDate(data.startDate, {
    value: plan.durationValue,
    unit: plan.durationUnit,
  })

  // 🔒 La fotografía del plan: precio, duración, límites y reglas tal como
  // estaban HOY. Es lo que hace que subir el precio mañana no cambie nada.
  const planSnapshot = {
    slug: plan.slug,
    name: plan.name,
    price: listPrice,
    durationValue: plan.durationValue,
    durationUnit: plan.durationUnit,
    sessionLimit: plan.sessionLimit,
    weeklyVisitLimit: plan.weeklyVisitLimit,
    dailyVisitLimit: plan.dailyVisitLimit,
    modality: plan.modality,
    graceDays: plan.graceDays,
    requiresSchedule: plan.requiresSchedule,
    capturedAt: new Date().toISOString(),
    entitlements: plan.entitlements.map((entitlement) => ({
      serviceCode: entitlement.service.code,
      quantity: entitlement.quantity,
      period: entitlement.period,
      rollover: entitlement.rollover,
    })),
  }

  const rules: EntitlementRule[] = plan.entitlements.map((entitlement) => ({
    serviceCode: entitlement.service.code,
    quantity: entitlement.quantity,
    period: entitlement.period,
    rollover: entitlement.rollover,
  }))

  const materialized = materializeEntitlements(rules, data.startDate)
  const byCode = new Map(plan.entitlements.map((e) => [e.service.code, e.serviceId]))

  return tx.membership.create({
    data: {
      clientId: data.clientId,
      planId: data.planId,
      planSnapshot: planSnapshot as never,
      listPrice: BigInt(listPrice),
      discountAmount: BigInt(data.discountAmount),
      discountReason: data.discountReason ?? null,
      finalPrice: BigInt(finalPrice),
      startDate: toUtcAnchor(data.startDate),
      endDate: endDate ? toUtcAnchor(endDate) : null,
      sessionsIncluded: plan.sessionLimit,
      status: 'PENDING',
      trainerId: data.trainerId ?? null,
      scheduleSlotId: data.scheduleSlotId ?? null,
      previousMembershipId: data.previousMembershipId ?? null,
      source: (data.source ?? 'ONSITE') as never,
      notes: data.notes ?? null,
      createdBy: data.createdBy,
      entitlements: {
        create: materialized.flatMap((entitlement) => {
          const serviceId = byCode.get(entitlement.serviceCode)
          if (!serviceId) return []
          return [
            {
              serviceId,
              snapshot: {
                quantity: entitlement.quantity,
                period: entitlement.period,
                rollover: entitlement.rollover,
              } as never,
              quantityTotal: entitlement.quantityTotal,
              period: entitlement.period as never,
              periodStart: entitlement.periodStart ? toUtcAnchor(entitlement.periodStart) : null,
              periodEnd: entitlement.periodEnd ? toUtcAnchor(entitlement.periodEnd) : null,
              rollover: entitlement.rollover,
              source: 'PLAN' as never,
            },
          ]
        }),
      },
    },
  })
}
