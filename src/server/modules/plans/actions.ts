'use server'

import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/server/infra/prisma'
import { requirePermission } from '@/server/auth/context'
import { record, recordChange } from '@/server/audit/audit-service'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { planSchema } from '@/shared/schemas/plans'
import { uniqueSlug } from './plan-service'

export interface PlanFormState {
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

const FIELDS = [
  'name', 'description', 'price', 'durationValue', 'durationUnit', 'sessionLimit',
  'weeklyVisitLimit', 'dailyVisitLimit', 'modality', 'maxCapacity', 'graceDays', 'status', 'benefits',
]

function readPlan(formData: FormData) {
  const raw: Record<string, unknown> = Object.fromEntries(
    FIELDS.map((key) => [key, formData.get(key) ?? undefined]),
  )
  // Las casillas solo llegan cuando están marcadas.
  for (const flag of ['requiresSchedule', 'isPublic', 'isRecommended', 'allowsOnlineRegistration', 'allowsDiscount']) {
    raw[flag] = formData.get(flag) === 'on'
  }
  return raw
}

/** Derechos: qué servicios incluye el plan y con qué límite. */
function readEntitlements(formData: FormData) {
  const result: { serviceId: string; quantity: number | null; period: string }[] = []
  for (const serviceId of formData.getAll('entitlementService')) {
    const id = String(serviceId)
    if (formData.get(`included-${id}`) !== 'on') continue
    const rawQuantity = String(formData.get(`quantity-${id}`) ?? '').trim()
    const quantity = rawQuantity === '' ? null : Number(rawQuantity)
    result.push({
      serviceId: id,
      quantity: Number.isFinite(quantity) && (quantity ?? 0) > 0 ? quantity : null,
      period: String(formData.get(`period-${id}`) ?? 'TOTAL'),
    })
  }
  return result
}

export async function createPlanAction(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const actor = await requirePermission(PERMISSIONS.PLAN_CREATE)

  const parsed = planSchema.safeParse(readPlan(formData))
  if (!parsed.success) return { ok: false, fieldErrors: collectErrors(parsed.error.issues) }

  const data = parsed.data
  const entitlements = readEntitlements(formData)

  // RN-120 · Un plan no se publica sin derechos declarados: si no, nadie puede
  // saber qué incluye, y esa es justamente la información que hace falta.
  if (entitlements.length === 0 && data.status === 'ACTIVE') {
    return { ok: false, message: 'Marca al menos un servicio incluido antes de activar el plan.' }
  }

  const slug = await uniqueSlug(data.name)

  const planId = await prisma.$transaction(async (tx) => {
    // RN · Solo un plan puede llevar la cinta «RECOMENDADO».
    if (data.isRecommended) {
      await tx.plan.updateMany({ where: { isRecommended: true }, data: { isRecommended: false } })
    }

    const plan = await tx.plan.create({
      data: {
        slug,
        name: data.name,
        description: data.description || null,
        price: BigInt(data.price),
        durationValue: data.durationValue ?? null,
        durationUnit: (data.durationUnit || null) as never,
        sessionLimit: data.sessionLimit ?? null,
        weeklyVisitLimit: data.weeklyVisitLimit ?? null,
        dailyVisitLimit: data.dailyVisitLimit ?? 1,
        modality: data.modality as never,
        requiresSchedule: Boolean(data.requiresSchedule),
        maxCapacity: data.maxCapacity ?? null,
        graceDays: data.graceDays ?? 0,
        isPublic: Boolean(data.isPublic),
        isRecommended: Boolean(data.isRecommended),
        allowsOnlineRegistration: Boolean(data.allowsOnlineRegistration),
        allowsDiscount: data.allowsDiscount !== false,
        status: data.status as never,
        benefits: (data.benefits ? data.benefits.split('\n').map((b) => b.trim()).filter(Boolean) : []) as never,
        createdBy: actor.userId,
        entitlements: {
          create: entitlements.map((entitlement) => ({
            serviceId: entitlement.serviceId,
            quantity: entitlement.quantity,
            period: entitlement.period as never,
          })),
        },
      },
    })

    await record(tx, {
      actor,
      action: 'plan.create',
      entityType: 'plan',
      entityId: plan.id,
      after: { name: data.name, price: data.price, status: data.status, servicios: entitlements.length },
      severity: 'NOTICE',
    })

    return plan.id
  })

  revalidatePath('/admin/planes')
  redirect(`/admin/planes/${planId}` as Route)
}

export async function updatePlanAction(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const actor = await requirePermission(PERMISSIONS.PLAN_UPDATE)
  const planId = String(formData.get('planId'))

  const parsed = planSchema.safeParse(readPlan(formData))
  if (!parsed.success) return { ok: false, fieldErrors: collectErrors(parsed.error.issues) }

  const data = parsed.data
  const entitlements = readEntitlements(formData)
  const before = await prisma.plan.findUniqueOrThrow({ where: { id: planId } })

  // RN-11 · Cambiar el precio NO afecta a las membresías ya vendidas: cada una
  // guarda su propia copia congelada. Aquí solo cambia el catálogo.
  await prisma.$transaction(async (tx) => {
    if (data.isRecommended && !before.isRecommended) {
      await tx.plan.updateMany({ where: { isRecommended: true }, data: { isRecommended: false } })
    }

    await tx.plan.update({
      where: { id: planId },
      data: {
        name: data.name,
        description: data.description || null,
        price: BigInt(data.price),
        durationValue: data.durationValue ?? null,
        durationUnit: (data.durationUnit || null) as never,
        sessionLimit: data.sessionLimit ?? null,
        weeklyVisitLimit: data.weeklyVisitLimit ?? null,
        dailyVisitLimit: data.dailyVisitLimit ?? 1,
        modality: data.modality as never,
        requiresSchedule: Boolean(data.requiresSchedule),
        maxCapacity: data.maxCapacity ?? null,
        graceDays: data.graceDays ?? 0,
        isPublic: Boolean(data.isPublic),
        isRecommended: Boolean(data.isRecommended),
        allowsOnlineRegistration: Boolean(data.allowsOnlineRegistration),
        allowsDiscount: data.allowsDiscount !== false,
        status: data.status as never,
        benefits: (data.benefits ? data.benefits.split('\n').map((b) => b.trim()).filter(Boolean) : []) as never,
      },
    })

    // Los derechos se reemplazan por completo: es más simple de razonar que
    // un diff, y las membresías vivas no se ven afectadas porque tienen los
    // suyos congelados.
    await tx.planEntitlement.deleteMany({ where: { planId } })
    if (entitlements.length > 0) {
      await tx.planEntitlement.createMany({
        data: entitlements.map((entitlement) => ({
          planId,
          serviceId: entitlement.serviceId,
          quantity: entitlement.quantity,
          period: entitlement.period as never,
        })),
      })
    }

    await recordChange(tx, {
      actor,
      action: before.price === BigInt(data.price) ? 'plan.update' : 'plan.price.update',
      entityType: 'plan',
      entityId: planId,
      before: { name: before.name, price: Number(before.price), status: before.status },
      after: { name: data.name, price: data.price, status: data.status },
      severity: before.price === BigInt(data.price) ? 'NOTICE' : 'WARNING',
    })
  })

  revalidatePath('/admin/planes')
  revalidatePath(`/admin/planes/${planId}`)
  return { ok: true, message: 'Plan actualizado.' }
}

/** Duplicar: copia todo menos el slug, el estado y la cinta de recomendado. */
export async function duplicatePlanAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.PLAN_DUPLICATE)
  const planId = String(formData.get('planId'))

  const source = await prisma.plan.findUniqueOrThrow({
    where: { id: planId },
    include: { entitlements: true },
  })

  const name = `${source.name} (copia)`
  const slug = await uniqueSlug(name)

  const copyId = await prisma.$transaction(async (tx) => {
    const copy = await tx.plan.create({
      data: {
        slug,
        name,
        description: source.description,
        price: source.price,
        durationValue: source.durationValue,
        durationUnit: source.durationUnit,
        sessionLimit: source.sessionLimit,
        weeklyVisitLimit: source.weeklyVisitLimit,
        dailyVisitLimit: source.dailyVisitLimit,
        modality: source.modality,
        requiresSchedule: source.requiresSchedule,
        maxCapacity: source.maxCapacity,
        graceDays: source.graceDays,
        allowsDiscount: source.allowsDiscount,
        benefits: source.benefits as never,
        // La copia nace en borrador y sin promoción heredada (RN-16).
        status: 'DRAFT',
        isPublic: false,
        isRecommended: false,
        createdBy: actor.userId,
        entitlements: {
          create: source.entitlements.map((entitlement) => ({
            serviceId: entitlement.serviceId,
            quantity: entitlement.quantity,
            period: entitlement.period,
            rollover: entitlement.rollover,
          })),
        },
      },
    })

    await record(tx, {
      actor,
      action: 'plan.duplicate',
      entityType: 'plan',
      entityId: copy.id,
      after: { copiadoDe: source.slug, name },
      severity: 'NOTICE',
    })

    return copy.id
  })

  revalidatePath('/admin/planes')
  redirect(`/admin/planes/${copyId}` as Route)
}

/**
 * RN-10 · Archivar no borra: el plan deja de venderse pero sus membresías
 * vivas siguen intactas, con sus condiciones congeladas.
 */
export async function archivePlanAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.PLAN_ARCHIVE)
  const planId = String(formData.get('planId'))
  const reason = String(formData.get('reason') ?? '').trim()

  const plan = await prisma.plan.findUniqueOrThrow({
    where: { id: planId },
    include: { _count: { select: { memberships: { where: { status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } } } } } },
  })

  const nextStatus = plan.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED'

  await prisma.$transaction(async (tx) => {
    await tx.plan.update({
      where: { id: planId },
      data: { status: nextStatus, isPublic: nextStatus === 'ARCHIVED' ? false : plan.isPublic },
    })
    await recordChange(tx, {
      actor,
      action: nextStatus === 'ARCHIVED' ? 'plan.archive' : 'plan.publish',
      entityType: 'plan',
      entityId: planId,
      before: { status: plan.status },
      after: { status: nextStatus, membresíasVivas: plan._count.memberships },
      reason: reason || null,
      severity: 'WARNING',
    })
  })

  revalidatePath('/admin/planes')
  revalidatePath(`/admin/planes/${planId}`)
}
