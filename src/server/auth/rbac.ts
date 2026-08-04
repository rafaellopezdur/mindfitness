/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTORIZACIÓN · punto único de decisión
 *
 * Regla innegociable: TODO permiso se verifica en el servidor. Ocultar un
 * botón en la interfaz es cosmética, no seguridad (RN-90).
 *
 * Un permiso responde "¿puede hacer esto?".
 * El ALCANCE responde "¿sobre qué?" — y se aplica en la consulta del
 * repositorio, nunca filtrando en la vista.
 *
 * Documentación: docs/03-roles-y-permisos.md
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { PERMISSIONS, REQUIRES_REASON, ROLE_CODES, type Permission, type RoleCode } from '@/shared/constants/permissions'

/** Quién actúa. Se construye una vez por petición y viaja a los servicios. */
export interface ActorContext {
  userId: string
  email: string
  fullName: string
  roles: RoleCode[]
  permissions: ReadonlySet<Permission>
  /** Presente solo si el usuario está vinculado a un entrenador. */
  trainerId?: string
  sessionId?: string
  ip?: string
  userAgent?: string
}

/** Actor del sistema para procesos automáticos (jobs, webhooks). */
export const SYSTEM_ACTOR: ActorContext = {
  userId: '00000000-0000-0000-0000-000000000000',
  email: 'sistema@mindfitnessclub.com.co',
  fullName: 'Sistema',
  roles: [],
  permissions: new Set(),
}

export function isSystemActor(actor: ActorContext): boolean {
  return actor.userId === SYSTEM_ACTOR.userId
}

/**
 * ¿El actor tiene este permiso?
 * Los procesos del sistema no pasan por RBAC: se autorizan por su origen
 * (endpoint de cron firmado, webhook verificado), no por permisos de usuario.
 */
export function can(actor: ActorContext, permission: Permission): boolean {
  if (isSystemActor(actor)) return true
  return actor.permissions.has(permission)
}

export function canAny(actor: ActorContext, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => can(actor, p))
}

export function canAll(actor: ActorContext, permissions: readonly Permission[]): boolean {
  return permissions.every((p) => can(actor, p))
}

export function hasRole(actor: ActorContext, role: RoleCode): boolean {
  return actor.roles.includes(role)
}

export function isOwner(actor: ActorContext): boolean {
  return hasRole(actor, ROLE_CODES.OWNER)
}

/* ─────────────────────────────────────────────────────────────────────────
   Errores de autorización
   ───────────────────────────────────────────────────────────────────────── */

export class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN'
  readonly permission: Permission

  constructor(permission: Permission) {
    super('No tienes permiso para realizar esta acción.')
    this.name = 'ForbiddenError'
    this.permission = permission
  }
}

export class ReasonRequiredError extends Error {
  readonly code = 'REASON_REQUIRED'

  constructor() {
    super('Esta acción requiere que indiques un motivo.')
    this.name = 'ReasonRequiredError'
  }
}

/** Lanza si falta el permiso. Es la forma habitual de usarlo en un servicio. */
export function assertCan(actor: ActorContext, permission: Permission): void {
  if (!can(actor, permission)) throw new ForbiddenError(permission)
}

/**
 * Permiso + motivo obligatorio para las acciones sensibles (RN-92).
 * El motivo se valida aquí, no en el formulario: un cliente de API tampoco
 * puede anular un pago sin explicar por qué.
 */
export function assertCanWithReason(actor: ActorContext, permission: Permission, reason?: string | null): void {
  assertCan(actor, permission)
  if (REQUIRES_REASON.includes(permission)) {
    if (!reason || reason.trim().length < 5) throw new ReasonRequiredError()
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Alcance
   ───────────────────────────────────────────────────────────────────────── */

export type ClientScope =
  | { kind: 'ALL' }
  | { kind: 'ASSIGNED'; trainerId: string }
  | { kind: 'NONE' }

/**
 * Qué clientes puede ver este actor. El repositorio traduce el resultado a un
 * `WHERE`, no se filtra en memoria ni en el navegador.
 *
 * P33 · "clientes asignados" a un entrenador significa: inscritos en las
 * franjas que cubre hoy ∪ asignaciones explícitas de alcance CLIENT.
 */
export function resolveClientScope(actor: ActorContext): ClientScope {
  if (can(actor, PERMISSIONS.CLIENT_READ)) return { kind: 'ALL' }
  if (can(actor, PERMISSIONS.CLIENT_READ_ASSIGNED) && actor.trainerId) {
    return { kind: 'ASSIGNED', trainerId: actor.trainerId }
  }
  return { kind: 'NONE' }
}

/**
 * ¿Puede ver importes? Determina la serialización, no la presentación.
 * Un entrenador no recibe campos de dinero en el DTO; ni con `curl` los ve.
 */
export function canSeeMoney(actor: ActorContext): boolean {
  return canAny(actor, [PERMISSIONS.PAYMENT_READ, PERMISSIONS.CHARGE_READ, PERMISSIONS.FINANCE_DASHBOARD_READ])
}

/**
 * La única excepción a "el entrenador no ve dinero": su propia liquidación.
 * Acotada al propio trainerId — nunca a la de otro.
 */
export function canSeeOwnSettlement(actor: ActorContext, trainerId: string): boolean {
  if (can(actor, PERMISSIONS.TRAINER_SETTLEMENT_READ)) return true
  return can(actor, PERMISSIONS.TRAINER_SETTLEMENT_READ_OWN) && actor.trainerId === trainerId
}

/* ─────────────────────────────────────────────────────────────────────────
   Salvaguardas estructurales
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Nadie modifica sus propios roles, ni siquiera OWNER (RN-94).
 * Evita a la vez el auto-ascenso y el auto-bloqueo.
 */
export function canModifyUserRoles(actor: ActorContext, targetUserId: string): boolean {
  if (actor.userId === targetUserId) return false
  return can(actor, PERMISSIONS.PERMISSION_ASSIGN)
}

/** Quien solicita una autorización jamás puede aprobarla (RN-128). */
export function canApproveAuthorization(actor: ActorContext, requestedByUserId: string): boolean {
  if (actor.userId === requestedByUserId) return false
  return can(actor, PERMISSIONS.AUTHORIZATION_APPROVE)
}
