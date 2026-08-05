'use server'

import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/server/infra/prisma'
import { requirePermission } from '@/server/auth/context'
import { record } from '@/server/audit/audit-service'
import { assertCanWithReason } from '@/server/auth/rbac'
import { PERMISSIONS } from '@/shared/constants/permissions'
import {
  businessToday,
  fromUtcAnchor,
  toBusinessDate,
  toUtcAnchor,
} from '@/server/domain/dates'
import {
  addCourtesyDays,
  checkDiscount,
  planRenewal,
  prorateCredit,
  resumeEndDate,
} from '@/server/domain/memberships'
import { getRules } from '@/server/modules/settings/settings-service'
import { createMembershipInTx } from './membership-service'

export interface MembershipFormState {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string>
}

function collectErrors(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

const createSchema = z.object({
  clientId: z.string().uuid('Elige un cliente'),
  planId: z.string().uuid('Elige un plan'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige la fecha de inicio'),
  discountAmount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => Number(String(value ?? '0').replace(/[^\d]/g, '')) || 0),
  discountReason: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

/** Registra el cambio en la bitácora del contrato Y en la auditoría global. */
async function logChange(
  tx: Parameters<typeof record>[0],
  input: {
    actor: Awaited<ReturnType<typeof requirePermission>>
    membershipId: string
    action: string
    before?: unknown
    after?: unknown
    reason?: string | null
    severity?: 'INFO' | 'NOTICE' | 'WARNING' | 'CRITICAL'
  },
) {
  await tx.membershipChange.create({
    data: {
      membershipId: input.membershipId,
      action: input.action,
      before: (input.before ?? undefined) as never,
      after: (input.after ?? undefined) as never,
      reason: input.reason ?? null,
      performedBy: input.actor.userId,
    },
  })
  await record(tx, {
    actor: input.actor,
    action: `membership.${input.action.toLowerCase()}`,
    entityType: 'membership',
    entityId: input.membershipId,
    before: input.before,
    after: input.after,
    reason: input.reason,
    severity: input.severity ?? 'NOTICE',
  })
}

export async function createMembershipAction(
  _prev: MembershipFormState,
  formData: FormData,
): Promise<MembershipFormState> {
  const actor = await requirePermission(PERMISSIONS.MEMBERSHIP_CREATE)

  const parsed = createSchema.safeParse({
    clientId: formData.get('clientId'),
    planId: formData.get('planId'),
    startDate: formData.get('startDate'),
    discountAmount: formData.get('discountAmount'),
    discountReason: formData.get('discountReason'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) return { ok: false, fieldErrors: collectErrors(parsed.error.issues) }

  const data = parsed.data

  // RN-20 · Como máximo una membresía viva por cliente.
  const existing = await prisma.membership.findFirst({
    where: { clientId: data.clientId, status: { in: ['PENDING', 'ACTIVE', 'PAUSED'] } },
    include: { plan: { select: { name: true } } },
  })
  if (existing) {
    return {
      ok: false,
      message: `Esta persona ya tiene una membresía viva (${existing.plan.name}). Renuévala o cámbiale el plan en lugar de crear otra.`,
    }
  }

  const plan = await prisma.plan.findUniqueOrThrow({ where: { id: data.planId } })
  if (plan.status === 'ARCHIVED') {
    return { ok: false, message: 'Ese plan está archivado y ya no se puede vender.' }
  }

  // RN-13 · Sin franja no se puede crear si el plan la exige.
  if (plan.requiresSchedule && !formData.get('scheduleSlotId')) {
    return { ok: false, message: 'Este plan exige elegir un horario. Aún no hay franjas configuradas.' }
  }

  if (data.discountAmount > 0) {
    const rules = await getRules()
    const check = checkDiscount({
      listPrice: Number(plan.price),
      discountAmount: data.discountAmount,
      maxPercentForRole: 100, // el tope por rol se afina cuando exista el módulo de pagos
      planAllowsDiscount: plan.allowsDiscount,
      planMaxPercent: plan.maxDiscountPercent,
    })
    if (!check.ok) return { ok: false, fieldErrors: { discountAmount: check.message ?? 'Descuento inválido' } }
    if (!data.discountReason) {
      return { ok: false, fieldErrors: { discountReason: 'Todo descuento necesita un motivo (RN-45)' } }
    }
    void rules
  }

  const membershipId = await prisma.$transaction(async (tx) => {
    const membership = await createMembershipInTx(tx, {
      clientId: data.clientId,
      planId: data.planId,
      startDate: toBusinessDate(data.startDate),
      discountAmount: data.discountAmount,
      discountReason: data.discountReason || undefined,
      notes: data.notes || undefined,
      createdBy: actor.userId,
    })

    await logChange(tx, {
      actor,
      membershipId: membership.id,
      action: 'CREATE',
      after: { plan: plan.name, finalPrice: Number(membership.finalPrice) },
    })

    return membership.id
  })

  revalidatePath('/admin/membresias')
  revalidatePath(`/admin/clientes/${data.clientId}`)
  redirect(`/admin/membresias/${membershipId}` as Route)
}

/**
 * RN-21 · Activar.
 * Mientras no exista el módulo de pagos, la activación es manual y auditada.
 * Cuando llegue la Fase 4, el pago confirmado la disparará solo.
 */
export async function activateMembershipAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.MEMBERSHIP_CREATE)
  const membershipId = String(formData.get('membershipId'))

  const membership = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } })
  if (membership.status !== 'PENDING') return

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({ where: { id: membershipId }, data: { status: 'ACTIVE' } })
    await logChange(tx, {
      actor,
      membershipId,
      action: 'ACTIVATE',
      before: { status: 'PENDING' },
      after: { status: 'ACTIVE' },
      reason: 'Activación manual · el módulo de pagos llega en la Fase 4',
    })
  })

  revalidatePath(`/admin/membresias/${membershipId}`)
  revalidatePath('/admin/membresias')
}

/** RN-22 · Pausar: el reloj se detiene. */
export async function pauseMembershipAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.MEMBERSHIP_PAUSE)
  const membershipId = String(formData.get('membershipId'))
  const reason = String(formData.get('reason') ?? '').trim()

  assertCanWithReason(actor, PERMISSIONS.MEMBERSHIP_PAUSE, reason || 'Pausa solicitada por el cliente')

  const membership = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } })
  if (membership.status !== 'ACTIVE') return

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: membershipId },
      data: { status: 'PAUSED', pausedAt: new Date() },
    })
    // Los derechos se suspenden con ella: no se consumen mientras está pausada.
    await tx.membershipEntitlement.updateMany({
      where: { membershipId, status: 'ACTIVE' },
      data: { status: 'SUSPENDED' },
    })
    await logChange(tx, {
      actor,
      membershipId,
      action: 'PAUSE',
      before: { status: 'ACTIVE' },
      after: { status: 'PAUSED' },
      reason: reason || 'Pausa solicitada por el cliente',
      severity: 'WARNING',
    })
  })

  revalidatePath(`/admin/membresias/${membershipId}`)
}

/** RN-22 · Reactivar: el vencimiento se corre exactamente los días pausados. */
export async function resumeMembershipAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.MEMBERSHIP_RESUME)
  const membershipId = String(formData.get('membershipId'))

  const membership = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } })
  if (membership.status !== 'PAUSED' || !membership.pausedAt) return

  const today = businessToday()
  const pausedOn = fromUtcAnchor(membership.pausedAt)

  let nextEnd: Date | null = membership.endDate
  let pausedDays = 0

  if (membership.endDate) {
    const result = resumeEndDate(fromUtcAnchor(membership.endDate), pausedOn, today)
    nextEnd = toUtcAnchor(result.endDate)
    pausedDays = result.pausedDays
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: membershipId },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
        endDate: nextEnd,
        pausedDaysTotal: membership.pausedDaysTotal + pausedDays,
      },
    })
    await tx.membershipEntitlement.updateMany({
      where: { membershipId, status: 'SUSPENDED' },
      data: { status: 'ACTIVE' },
    })
    await logChange(tx, {
      actor,
      membershipId,
      action: 'RESUME',
      before: { endDate: membership.endDate ? fromUtcAnchor(membership.endDate) : null },
      after: { endDate: nextEnd ? fromUtcAnchor(nextEnd) : null, díasDevueltos: pausedDays },
      reason: `Reactivada tras ${pausedDays} días de pausa`,
    })
  })

  revalidatePath(`/admin/membresias/${membershipId}`)
}

/** RN-28 · Días de cortesía: exigen permiso, motivo y quedan auditados. */
export async function addCourtesyAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.MEMBERSHIP_COURTESY_DAYS)
  const membershipId = String(formData.get('membershipId'))
  const days = Number(formData.get('days'))
  const reason = String(formData.get('reason') ?? '').trim()

  assertCanWithReason(actor, PERMISSIONS.MEMBERSHIP_COURTESY_DAYS, reason)
  if (!Number.isFinite(days) || days <= 0) throw new Error('Indica cuántos días de cortesía.')

  const membership = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } })
  if (!membership.endDate) throw new Error('Esta membresía no tiene fecha de vencimiento.')

  // Se captura en un local: TypeScript no conserva el estrechamiento de una
  // propiedad al cruzar la frontera de la función de la transacción.
  const currentEnd = fromUtcAnchor(membership.endDate)
  const nextEnd = addCourtesyDays(currentEnd, days)

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: membershipId },
      data: { endDate: toUtcAnchor(nextEnd), courtesyDays: membership.courtesyDays + days },
    })
    await logChange(tx, {
      actor,
      membershipId,
      action: 'COURTESY_DAYS',
      before: { endDate: currentEnd },
      after: { endDate: nextEnd, días: days },
      reason,
      severity: 'WARNING',
    })
  })

  revalidatePath(`/admin/membresias/${membershipId}`)
}

/**
 * RN-24 / RN-25 · Renovar crea una membresía NUEVA encadenada.
 * Nunca se modifica la anterior: el histórico es el histórico.
 */
export async function renewMembershipAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.MEMBERSHIP_RENEW)
  const membershipId = String(formData.get('membershipId'))

  const current = await prisma.membership.findUniqueOrThrow({
    where: { id: membershipId },
    include: { plan: true },
  })

  if (current.status === 'PAUSED') {
    throw new Error('Primero reactiva la membresía: no se renueva una pausada.')
  }

  const snapshot = current.planSnapshot as { graceDays?: number } | null
  const renewal = planRenewal(
    { endDate: current.endDate ? fromUtcAnchor(current.endDate) : null },
    { graceDays: snapshot?.graceDays ?? current.plan.graceDays },
  )

  const newId = await prisma.$transaction(async (tx) => {
    // La anterior se cierra antes de crear la nueva, para no violar la regla
    // de «una sola membresía viva por cliente».
    await tx.membership.update({
      where: { id: membershipId },
      data: { status: current.endDate ? 'EXPIRED' : 'COMPLETED' },
    })

    const created = await createMembershipInTx(tx, {
      clientId: current.clientId,
      planId: current.planId,
      startDate: renewal.startDate,
      discountAmount: 0,
      previousMembershipId: membershipId,
      source: 'RENEWAL',
      createdBy: actor.userId,
    })

    await logChange(tx, {
      actor,
      membershipId: created.id,
      action: 'RENEW',
      after: {
        renovaciónDe: membershipId,
        tipo: renewal.kind,
        inicio: renewal.startDate,
        díasConservados: renewal.preservedDays,
      },
    })

    return created.id
  })

  revalidatePath('/admin/membresias')
  redirect(`/admin/membresias/${newId}` as Route)
}

/**
 * RN-27 · Cambio de plan: la actual pasa a SUPERSEDED y nace otra.
 * El crédito por los días no disfrutados se calcula y se registra; se aplicará
 * como saldo a favor cuando exista el módulo de pagos.
 */
export async function changePlanAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.MEMBERSHIP_CHANGE_PLAN)
  const membershipId = String(formData.get('membershipId'))
  const newPlanId = String(formData.get('planId'))
  const reason = String(formData.get('reason') ?? '').trim()

  const current = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } })
  const today = businessToday()

  const credit = prorateCredit({
    finalPrice: Number(current.finalPrice),
    startDate: fromUtcAnchor(current.startDate),
    endDate: current.endDate ? fromUtcAnchor(current.endDate) : null,
    changeDate: today,
  })

  const newId = await prisma.$transaction(async (tx) => {
    await tx.membership.update({ where: { id: membershipId }, data: { status: 'SUPERSEDED' } })

    const created = await createMembershipInTx(tx, {
      clientId: current.clientId,
      planId: newPlanId,
      startDate: today,
      discountAmount: 0,
      previousMembershipId: membershipId,
      createdBy: actor.userId,
      notes: `Cambio de plan · crédito a favor: ${credit.credit}`,
    })

    await logChange(tx, {
      actor,
      membershipId: created.id,
      action: 'CHANGE_PLAN',
      before: { membresíaAnterior: membershipId },
      after: { créditoAFavor: credit.credit, díasNoDisfrutados: credit.remainingDays },
      reason: reason || 'Cambio de plan',
      severity: 'WARNING',
    })

    return created.id
  })

  revalidatePath('/admin/membresias')
  redirect(`/admin/membresias/${newId}` as Route)
}

/** RN-29 · Cancelar exige motivo. */
export async function cancelMembershipAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.MEMBERSHIP_CANCEL)
  const membershipId = String(formData.get('membershipId'))
  const reason = String(formData.get('reason') ?? '').trim()

  assertCanWithReason(actor, PERMISSIONS.MEMBERSHIP_CANCEL, reason)

  const membership = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } })

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: membershipId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    })
    await tx.membershipEntitlement.updateMany({
      where: { membershipId },
      data: { status: 'EXPIRED' },
    })
    await logChange(tx, {
      actor,
      membershipId,
      action: 'CANCEL',
      before: { status: membership.status },
      after: { status: 'CANCELLED' },
      reason,
      severity: 'WARNING',
    })
  })

  revalidatePath('/admin/membresias')
  revalidatePath(`/admin/membresias/${membershipId}`)
}
