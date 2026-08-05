/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MOTOR DE ACCESO · lógica pura, sin I/O
 *
 * Responde «¿puede esta persona recibir este servicio ahora?» con un código,
 * no con una interpretación. Es lo que alimenta la tarjeta del entrenador y
 * el check-in de asistencia.
 *
 * Los mensajes viven en un único mapa: cambiar la redacción es editar un
 * archivo, y añadir un caso es añadir un código y una prueba.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { businessToday, daysBetween, isExpired, isInGrace, type BusinessDate } from './dates'
import { entitlementRemaining, type MaterializedEntitlement } from './memberships'

export type AccessReason =
  | 'GRANTED'
  | 'NO_MEMBERSHIP'
  | 'EXPIRED'
  | 'IN_GRACE'
  | 'PAUSED'
  | 'PENDING_PAYMENT'
  | 'CANCELLED'
  | 'SERVICE_NOT_INCLUDED'
  | 'NO_SESSIONS_LEFT'
  | 'OUTSIDE_SCHEDULE'
  | 'WEEKLY_LIMIT_REACHED'
  | 'ASSIGNED_TO_OTHER_TRAINER'
  | 'EXCEPTIONAL_ACCESS'
  | 'BLOCKED'

export type AccessOutcome = 'GRANTED' | 'GRANTED_WITH_WARNING' | 'REQUIRES_AUTHORIZATION' | 'DENIED'
export type AccessSeverity = 'ok' | 'info' | 'warning' | 'error'

export interface AccessDecision {
  outcome: AccessOutcome
  reason: AccessReason
  severity: AccessSeverity
  /** Frase lista para mostrar, ya en español y sin jerga. */
  message: string
  /** Qué puede hacer el operador a continuación. */
  suggestedActions: AccessAction[]
}

export type AccessAction =
  | 'REGISTER_SESSION'
  | 'REQUEST_AUTHORIZATION'
  | 'CHARGE_EXTRA_SESSION'
  | 'RENEW_MEMBERSHIP'
  | 'COLLECT_PAYMENT'
  | 'CREATE_MEMBERSHIP'

export interface AccessInput {
  clientBlocked?: boolean
  membership: {
    status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED' | 'SUPERSEDED'
    endDate: BusinessDate | null
    hasOutstandingCharge: boolean
    graceDays: number
  } | null
  /** Servicio que se quiere prestar. Si se omite, se evalúa solo la vigencia. */
  serviceCode?: string
  entitlements?: MaterializedEntitlement[]
  /** Visitas ya registradas en la ventana semanal. */
  weeklyVisits?: { used: number; limit: number | null }
  schedule?: { withinSlot: boolean; enforced: boolean }
  trainer?: { assignedTrainerId: string | null; requestingTrainerId: string | null }
  hasValidAuthorization?: boolean
  today?: BusinessDate
  /** P30 · `WARN` deja entrar y registra; `BLOCK` impide la entrada. */
  weeklyLimitEnforcement?: 'WARN' | 'BLOCK' | 'OFF'
}

const MESSAGES: Record<AccessReason, string> = {
  GRANTED: 'Cliente activo',
  NO_MEMBERSHIP: 'No se encontró una membresía activa',
  EXPIRED: 'Membresía vencida',
  IN_GRACE: 'En periodo de gracia',
  PAUSED: 'Membresía pausada',
  PENDING_PAYMENT: 'Cliente con pago pendiente',
  CANCELLED: 'Membresía cancelada',
  SERVICE_NOT_INCLUDED: 'Cliente activo, pero su plan no incluye este servicio',
  NO_SESSIONS_LEFT: 'Cliente sin sesiones restantes',
  OUTSIDE_SCHEDULE: 'Fuera de su horario autorizado',
  WEEKLY_LIMIT_REACHED: 'Superó sus días de esta semana',
  ASSIGNED_TO_OTHER_TRAINER: 'Cliente asignado a otro entrenador',
  EXCEPTIONAL_ACCESS: 'Acceso excepcional autorizado',
  BLOCKED: 'Cliente bloqueado',
}

function decide(
  reason: AccessReason,
  outcome: AccessOutcome,
  severity: AccessSeverity,
  suggestedActions: AccessAction[],
  detail?: string,
): AccessDecision {
  return {
    outcome,
    reason,
    severity,
    message: detail ? `${MESSAGES[reason]} · ${detail}` : MESSAGES[reason],
    suggestedActions,
  }
}

/**
 * RN-126 · Resuelve el acceso.
 *
 * El orden importa: primero lo que impide todo (bloqueo, sin membresía,
 * vigencia), después lo que depende del servicio concreto, y al final los
 * límites que solo avisan.
 */
export function resolveAccess(input: AccessInput): AccessDecision {
  const today = input.today ?? businessToday()

  if (input.clientBlocked) {
    return decide('BLOCKED', 'DENIED', 'error', [])
  }

  const membership = input.membership
  if (!membership) {
    return decide('NO_MEMBERSHIP', 'DENIED', 'error', ['CREATE_MEMBERSHIP'])
  }

  switch (membership.status) {
    case 'CANCELLED':
    case 'SUPERSEDED':
      return decide('CANCELLED', 'DENIED', 'error', ['CREATE_MEMBERSHIP'])
    case 'PAUSED':
      return decide('PAUSED', 'DENIED', 'error', [])
    case 'PENDING':
      if (membership.hasOutstandingCharge) {
        return decide('PENDING_PAYMENT', 'REQUIRES_AUTHORIZATION', 'error', ['COLLECT_PAYMENT'])
      }
      break
    case 'EXPIRED':
    case 'COMPLETED': {
      if (membership.endDate && isInGrace(membership.endDate, membership.graceDays, today)) {
        return decide('IN_GRACE', 'GRANTED_WITH_WARNING', 'warning', [
          'REGISTER_SESSION',
          'RENEW_MEMBERSHIP',
        ])
      }
      return decide('EXPIRED', 'DENIED', 'error', ['RENEW_MEMBERSHIP'])
    }
  }

  // Vigencia por calendario, aunque el estado almacenado diga ACTIVE: el
  // estado se deriva, no se confía en que un job haya corrido (ADR-0003).
  if (membership.endDate && isExpired(membership.endDate, today)) {
    if (isInGrace(membership.endDate, membership.graceDays, today)) {
      return decide('IN_GRACE', 'GRANTED_WITH_WARNING', 'warning', ['REGISTER_SESSION', 'RENEW_MEMBERSHIP'])
    }
    return decide('EXPIRED', 'DENIED', 'error', ['RENEW_MEMBERSHIP'])
  }

  // ── A partir de aquí la membresía está vigente ──────────────────────
  if (input.serviceCode) {
    const entitlement = input.entitlements?.find((item) => item.serviceCode === input.serviceCode)

    if (!entitlement) {
      if (input.hasValidAuthorization) {
        return decide('EXCEPTIONAL_ACCESS', 'GRANTED', 'info', ['REGISTER_SESSION'])
      }
      return decide('SERVICE_NOT_INCLUDED', 'REQUIRES_AUTHORIZATION', 'warning', [
        'REQUEST_AUTHORIZATION',
        'CHARGE_EXTRA_SESSION',
      ])
    }

    const remaining = entitlementRemaining(entitlement)
    if (remaining !== null && remaining <= 0) {
      if (input.hasValidAuthorization) {
        return decide('EXCEPTIONAL_ACCESS', 'GRANTED', 'info', ['REGISTER_SESSION'])
      }
      return decide('NO_SESSIONS_LEFT', 'REQUIRES_AUTHORIZATION', 'warning', [
        'CHARGE_EXTRA_SESSION',
        'REQUEST_AUTHORIZATION',
      ])
    }
  }

  if (input.schedule?.enforced && !input.schedule.withinSlot) {
    return decide('OUTSIDE_SCHEDULE', 'REQUIRES_AUTHORIZATION', 'warning', ['REQUEST_AUTHORIZATION'])
  }

  // P33 · Con entrenador de turno esto casi nunca salta: solo si hay una
  // asignación explícita a otra persona.
  if (
    input.trainer?.assignedTrainerId &&
    input.trainer.requestingTrainerId &&
    input.trainer.assignedTrainerId !== input.trainer.requestingTrainerId
  ) {
    return decide('ASSIGNED_TO_OTHER_TRAINER', 'GRANTED_WITH_WARNING', 'warning', ['REGISTER_SESSION'])
  }

  // P30 · El límite semanal es blando por defecto: bloquear a alguien que ya
  // pagó, en la puerta y con gente detrás, cuesta más que el día regalado.
  const weekly = input.weeklyVisits
  if (weekly?.limit !== null && weekly?.limit !== undefined && weekly.used >= weekly.limit) {
    const mode = input.weeklyLimitEnforcement ?? 'WARN'
    if (mode === 'BLOCK') {
      return decide('WEEKLY_LIMIT_REACHED', 'REQUIRES_AUTHORIZATION', 'warning', ['REQUEST_AUTHORIZATION'])
    }
    if (mode === 'WARN') {
      return decide(
        'WEEKLY_LIMIT_REACHED',
        'GRANTED_WITH_WARNING',
        'warning',
        ['REGISTER_SESSION'],
        `lleva ${weekly.used} de ${weekly.limit}`,
      )
    }
  }

  const detail =
    membership.endDate !== null
      ? `vence en ${daysBetween(today, membership.endDate)} días`
      : undefined

  return decide('GRANTED', 'GRANTED', 'ok', ['REGISTER_SESSION'], detail)
}

/** ¿Deja pasar? Atajo para el check-in. */
export function allowsEntry(decision: AccessDecision): boolean {
  return decision.outcome === 'GRANTED' || decision.outcome === 'GRANTED_WITH_WARNING'
}
