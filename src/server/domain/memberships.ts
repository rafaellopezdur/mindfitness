/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MEMBRESÍAS Y DERECHOS · lógica pura, sin I/O
 *
 * Aquí viven las reglas que no se pueden equivocar: vigencia, pausas,
 * prorrateo, renovación y consumo de derechos. Se prueban en milisegundos
 * porque no tocan la base de datos.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  addDays,
  businessToday,
  calculateEndDate,
  daysBetween,
  isExpired,
  isInGrace,
  monthBounds,
  weekBounds,
  type BusinessDate,
  type DurationUnit,
} from './dates'

/* ─────────────────────────────────────────────────────────────────────────
   Precio vigente
   ───────────────────────────────────────────────────────────────────────── */

export interface PlanPricing {
  price: number
  promoPrice?: number | null
  promoStartsAt?: BusinessDate | null
  promoEndsAt?: BusinessDate | null
}

/**
 * RN-12 · El precio promocional solo aplica dentro de su ventana.
 * Fuera de ella rige el precio normal, aunque el promocional siga cargado.
 */
export function effectivePrice(plan: PlanPricing, today: BusinessDate = businessToday()): number {
  const { promoPrice, promoStartsAt, promoEndsAt } = plan
  if (promoPrice === null || promoPrice === undefined) return plan.price
  if (promoStartsAt && today < promoStartsAt) return plan.price
  if (promoEndsAt && today > promoEndsAt) return plan.price
  return promoPrice
}

/* ─────────────────────────────────────────────────────────────────────────
   Vigencia
   ───────────────────────────────────────────────────────────────────────── */

export interface MembershipDates {
  startDate: BusinessDate
  endDate: BusinessDate | null
}

/** Calcula el vencimiento de una membresía nueva a partir de la duración. */
export function membershipEndDate(
  startDate: BusinessDate,
  duration: { value: number | null; unit: DurationUnit | null },
): BusinessDate | null {
  if (!duration.value || !duration.unit) return null
  return calculateEndDate(startDate, duration.value, duration.unit)
}

/**
 * RN-22 · Pausa: el reloj se detiene.
 * Al reactivar, el vencimiento se corre exactamente los días pausados, así que
 * la persona no pierde lo que pagó.
 */
export function resumeEndDate(
  endDate: BusinessDate,
  pausedOn: BusinessDate,
  resumedOn: BusinessDate,
): { endDate: BusinessDate; pausedDays: number } {
  const pausedDays = Math.max(0, daysBetween(pausedOn, resumedOn))
  return { endDate: addDays(endDate, pausedDays), pausedDays }
}

/** RN-28 · Días de cortesía: se suman al vencimiento y quedan auditados. */
export function addCourtesyDays(endDate: BusinessDate, days: number): BusinessDate {
  if (days <= 0) throw new Error('Los días de cortesía deben ser mayores que cero.')
  return addDays(endDate, days)
}

/* ─────────────────────────────────────────────────────────────────────────
   Renovación
   ───────────────────────────────────────────────────────────────────────── */

export type RenewalKind = 'ANTICIPATED' | 'WITHIN_GRACE' | 'LAPSED'

export interface RenewalPlan {
  kind: RenewalKind
  startDate: BusinessDate
  /** Días que se habrían perdido si no se encadenara. */
  preservedDays: number
}

/**
 * RN-25 / RN-26 · Fecha de inicio de una renovación.
 *
 * · Anticipada (aún vigente): encadena desde el día siguiente al vencimiento,
 *   para que no se pierda ni un día de lo ya pagado.
 * · Vencida dentro de la gracia: por defecto empieza hoy. Con
 *   `backdateWithinGrace` continúa desde el vencimiento, sin huecos.
 * · Vencida hace tiempo: empieza hoy.
 */
export function planRenewal(
  current: { endDate: BusinessDate | null },
  options: {
    today?: BusinessDate
    graceDays?: number
    backdateWithinGrace?: boolean
  } = {},
): RenewalPlan {
  const today = options.today ?? businessToday()
  const graceDays = options.graceDays ?? 0
  const endDate = current.endDate

  // Sin fecha de fin (plan por sesiones): siempre empieza hoy.
  if (!endDate) return { kind: 'LAPSED', startDate: today, preservedDays: 0 }

  if (!isExpired(endDate, today)) {
    const startDate = addDays(endDate, 1)
    return { kind: 'ANTICIPATED', startDate, preservedDays: daysBetween(today, endDate) + 1 }
  }

  if (isInGrace(endDate, graceDays, today)) {
    return options.backdateWithinGrace
      ? { kind: 'WITHIN_GRACE', startDate: addDays(endDate, 1), preservedDays: 0 }
      : { kind: 'WITHIN_GRACE', startDate: today, preservedDays: 0 }
  }

  return { kind: 'LAPSED', startDate: today, preservedDays: 0 }
}

/* ─────────────────────────────────────────────────────────────────────────
   Cambio de plan
   ───────────────────────────────────────────────────────────────────────── */

/**
 * RN-27 · Crédito por los días no disfrutados al cambiar de plan.
 *
 * Se redondea SIEMPRE hacia abajo: ante la duda, el crédito es menor y nunca
 * se regala dinero por un redondeo. La diferencia se resuelve a favor del
 * gimnasio de forma explícita, no por accidente de coma flotante.
 */
export function prorateCredit(input: {
  finalPrice: number
  startDate: BusinessDate
  endDate: BusinessDate | null
  changeDate?: BusinessDate
}): { credit: number; remainingDays: number; totalDays: number } {
  const changeDate = input.changeDate ?? businessToday()
  if (!input.endDate) return { credit: 0, remainingDays: 0, totalDays: 0 }

  const totalDays = daysBetween(input.startDate, input.endDate) + 1
  if (totalDays <= 0) return { credit: 0, remainingDays: 0, totalDays: 0 }

  const remainingDays = Math.max(0, daysBetween(changeDate, input.endDate) + 1)
  const credit = Math.floor((input.finalPrice * remainingDays) / totalDays)

  return { credit, remainingDays, totalDays }
}

/* ─────────────────────────────────────────────────────────────────────────
   Descuentos
   ───────────────────────────────────────────────────────────────────────── */

export interface DiscountCheck {
  ok: boolean
  requiresApproval: boolean
  percent: number
  message?: string
}

/**
 * RN-44 · El descuento por encima del tope del rol exige aprobación de OWNER.
 * No lo bloquea: lo marca, porque en el mostrador la decisión comercial ya
 * está tomada y lo que hace falta es que quede registrada.
 */
export function checkDiscount(input: {
  listPrice: number
  discountAmount: number
  maxPercentForRole: number
  planAllowsDiscount: boolean
  planMaxPercent?: number | null
}): DiscountCheck {
  const { listPrice, discountAmount } = input

  if (discountAmount <= 0) return { ok: true, requiresApproval: false, percent: 0 }
  if (discountAmount > listPrice) {
    return { ok: false, requiresApproval: false, percent: 0, message: 'El descuento supera el precio' }
  }
  if (!input.planAllowsDiscount) {
    return { ok: false, requiresApproval: false, percent: 0, message: 'Este plan no admite descuentos' }
  }

  const percent = Math.round((discountAmount / listPrice) * 100)

  if (input.planMaxPercent !== null && input.planMaxPercent !== undefined && percent > input.planMaxPercent) {
    return {
      ok: false,
      requiresApproval: false,
      percent,
      message: `Este plan admite como máximo ${input.planMaxPercent}% de descuento`,
    }
  }

  return { ok: true, requiresApproval: percent > input.maxPercentForRole, percent }
}

/* ─────────────────────────────────────────────────────────────────────────
   Derechos
   ───────────────────────────────────────────────────────────────────────── */

export type EntitlementPeriod = 'TOTAL' | 'DAY' | 'WEEK' | 'MONTH'

export interface EntitlementRule {
  serviceCode: string
  /** Nulo = ilimitado. */
  quantity: number | null
  period: EntitlementPeriod
  rollover: boolean
}

export interface MaterializedEntitlement extends EntitlementRule {
  quantityTotal: number | null
  quantityUsed: number
  periodStart: BusinessDate | null
  periodEnd: BusinessDate | null
}

/**
 * Convierte las reglas del plan en los derechos concretos de una membresía.
 * Se ejecuta DENTRO de la transacción que crea la membresía (RN-121), y desde
 * ese momento la regla queda congelada: cambiar el plan no altera lo vendido.
 */
export function materializeEntitlements(
  rules: EntitlementRule[],
  startDate: BusinessDate,
  weekStartsOn: 'MONDAY' | 'SUNDAY' = 'MONDAY',
): MaterializedEntitlement[] {
  return rules.map((rule) => {
    const window = entitlementWindow(rule.period, startDate, weekStartsOn)
    return {
      ...rule,
      quantityTotal: rule.quantity,
      quantityUsed: 0,
      periodStart: window.start,
      periodEnd: window.end,
    }
  })
}

/** Ventana vigente de un derecho según su periodicidad. */
export function entitlementWindow(
  period: EntitlementPeriod,
  date: BusinessDate,
  weekStartsOn: 'MONDAY' | 'SUNDAY' = 'MONDAY',
): { start: BusinessDate | null; end: BusinessDate | null } {
  switch (period) {
    case 'TOTAL':
      return { start: null, end: null }
    case 'DAY':
      return { start: date, end: date }
    case 'WEEK':
      return weekBounds(date, weekStartsOn)
    case 'MONTH':
      return monthBounds(date)
  }
}

export type ConsumeOutcome =
  | { ok: true; remaining: number | null; periodReset: boolean }
  | { ok: false; reason: 'EXHAUSTED' | 'NOT_INCLUDED'; remaining: number }

/**
 * Consume una unidad de un derecho.
 *
 * Si la fecha cae fuera de la ventana vigente, el contador se REINICIA antes
 * de consumir: es lo que hace que «3 días por semana» signifique tres cada
 * semana y no tres en total. Con `rollover`, lo no usado se arrastra.
 */
export function consumeEntitlement(
  entitlement: MaterializedEntitlement,
  on: BusinessDate,
): ConsumeOutcome {
  // Ilimitado: siempre alcanza.
  if (entitlement.quantityTotal === null) return { ok: true, remaining: null, periodReset: false }

  const inWindow =
    entitlement.periodStart === null ||
    entitlement.periodEnd === null ||
    (on >= entitlement.periodStart && on <= entitlement.periodEnd)

  let used = entitlement.quantityUsed
  let total = entitlement.quantityTotal
  let periodReset = false

  if (!inWindow) {
    periodReset = true
    const unused = Math.max(0, entitlement.quantityTotal - entitlement.quantityUsed)
    total = entitlement.rollover ? entitlement.quantityTotal + unused : entitlement.quantityTotal
    used = 0
  }

  if (used >= total) return { ok: false, reason: 'EXHAUSTED', remaining: 0 }
  return { ok: true, remaining: total - used - 1, periodReset }
}

export function entitlementRemaining(entitlement: MaterializedEntitlement): number | null {
  if (entitlement.quantityTotal === null) return null
  return Math.max(0, entitlement.quantityTotal - entitlement.quantityUsed)
}

/* ─────────────────────────────────────────────────────────────────────────
   Cupos
   ───────────────────────────────────────────────────────────────────────── */

/**
 * RN-70 · Cupos disponibles de una franja.
 * Las reservas temporales del checkout cuentan como ocupadas mientras vivan:
 * si no, dos personas podrían pagar el mismo último lugar.
 */
export function availableCapacity(input: {
  capacity: number
  activeEnrollments: number
  heldReservations: number
}): number {
  return Math.max(0, input.capacity - input.activeEnrollments - input.heldReservations)
}

/* ─────────────────────────────────────────────────────────────────────────
   Resolución de entrenador
   ───────────────────────────────────────────────────────────────────────── */

export type AssignmentScope = 'CLIENT' | 'MEMBERSHIP' | 'SLOT' | 'PLAN' | 'EVENT' | 'TEMPORARY'

export interface Assignment {
  trainerId: string
  scope: AssignmentScope
  role: 'PRIMARY' | 'SUPPORT' | 'SUBSTITUTE'
  createdAt: string
}

/** Cuanto más específico en el tiempo, más manda. */
const SCOPE_PRIORITY: Record<AssignmentScope, number> = {
  TEMPORARY: 1,
  MEMBERSHIP: 2,
  CLIENT: 3,
  SLOT: 4,
  PLAN: 5,
  EVENT: 6,
}

/**
 * RN-132 · Quién atiende a esta persona ahora mismo.
 *
 * Devuelve también el ALCANCE, porque la tarjeta debe decir de dónde viene la
 * asignación: un entrenador que no entiende por qué le aparece un cliente deja
 * de confiar en el sistema.
 */
export function resolveTrainer(assignments: Assignment[]): Assignment | null {
  if (assignments.length === 0) return null

  return [...assignments].sort((a, b) => {
    const byScope = SCOPE_PRIORITY[a.scope] - SCOPE_PRIORITY[b.scope]
    if (byScope !== 0) return byScope
    // A igual alcance manda PRIMARY; si empatan, la asignación más reciente.
    if (a.role !== b.role) {
      if (a.role === 'PRIMARY') return -1
      if (b.role === 'PRIMARY') return 1
    }
    return b.createdAt.localeCompare(a.createdAt)
  })[0]!
}

export const ASSIGNMENT_SOURCE_LABEL: Record<AssignmentScope, string> = {
  TEMPORARY: 'suplencia',
  MEMBERSHIP: 'asignado a su membresía',
  CLIENT: 'asignado directamente',
  SLOT: 'por su horario',
  PLAN: 'por defecto del plan',
  EVENT: 'por el evento',
}
