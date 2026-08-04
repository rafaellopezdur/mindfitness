/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATÁLOGO DE PERMISOS
 *
 * Los PERMISOS son constantes de código: no se crean desde la interfaz.
 * Los ROLES son datos en base de datos: se pueden crear y editar.
 *
 * Formato: `recurso.acción`. Los sufijos `.own` y `.assigned` indican que
 * el permiso está acotado por alcance, no que sea un permiso distinto.
 *
 * Documentación: docs/03-roles-y-permisos.md
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const PERMISSIONS = {
  // ── Clientes ──────────────────────────────────────────────────────────
  CLIENT_READ: 'client.read',
  CLIENT_READ_ASSIGNED: 'client.read.assigned',
  CLIENT_CREATE: 'client.create',
  CLIENT_UPDATE: 'client.update',
  CLIENT_UPDATE_SENSITIVE: 'client.update.sensitive',
  CLIENT_STATUS_OVERRIDE: 'client.status.override',
  CLIENT_NOTE_CREATE: 'client.note.create',
  CLIENT_NOTE_READ_INTERNAL: 'client.note.read.internal',
  CLIENT_DOCUMENT_READ: 'client.document.read',
  CLIENT_DOCUMENT_UPLOAD: 'client.document.upload',
  CLIENT_DELETE: 'client.delete',
  CLIENT_EXPORT: 'client.export',

  // ── Planes ────────────────────────────────────────────────────────────
  PLAN_READ: 'plan.read',
  PLAN_CREATE: 'plan.create',
  PLAN_UPDATE: 'plan.update',
  PLAN_DUPLICATE: 'plan.duplicate',
  PLAN_PUBLISH: 'plan.publish',
  PLAN_ARCHIVE: 'plan.archive',
  PLAN_PRICE_UPDATE: 'plan.price.update',

  // ── Membresías ────────────────────────────────────────────────────────
  MEMBERSHIP_READ: 'membership.read',
  MEMBERSHIP_READ_ASSIGNED: 'membership.read.assigned',
  MEMBERSHIP_CREATE: 'membership.create',
  MEMBERSHIP_RENEW: 'membership.renew',
  MEMBERSHIP_EXTEND: 'membership.extend',
  MEMBERSHIP_PAUSE: 'membership.pause',
  MEMBERSHIP_RESUME: 'membership.resume',
  MEMBERSHIP_CHANGE_PLAN: 'membership.change_plan',
  MEMBERSHIP_CANCEL: 'membership.cancel',
  MEMBERSHIP_COURTESY_DAYS: 'membership.courtesy_days',
  MEMBERSHIP_TRANSFER_BALANCE: 'membership.transfer_balance',
  MEMBERSHIP_OVERRIDE_DATES: 'membership.override_dates',

  // ── Cargos y pagos ────────────────────────────────────────────────────
  CHARGE_READ: 'charge.read',
  CHARGE_CREATE: 'charge.create',
  CHARGE_UPDATE: 'charge.update',
  PAYMENT_READ: 'payment.read',
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_CREATE_CASH: 'payment.create.cash',
  PAYMENT_CREATE_ONLINE: 'payment.create.online',
  PAYMENT_UPDATE: 'payment.update',
  PAYMENT_VOID: 'payment.void',
  PAYMENT_REFUND: 'payment.refund',
  PAYMENT_DISCOUNT_APPLY: 'payment.discount.apply',
  PAYMENT_DISCOUNT_APPROVE: 'payment.discount.approve',
  PAYMENT_RECONCILE: 'payment.reconcile',
  RECEIPT_READ: 'receipt.read',
  RECEIPT_SEND: 'receipt.send',

  // ── Cartera ───────────────────────────────────────────────────────────
  COLLECTION_READ: 'collection.read',
  COLLECTION_ACTION_CREATE: 'collection.action.create',
  COLLECTION_COMMITMENT_CREATE: 'collection.commitment.create',
  REMINDER_SEND: 'reminder.send',

  // ── Asistencia ────────────────────────────────────────────────────────
  ATTENDANCE_READ: 'attendance.read',
  ATTENDANCE_READ_ASSIGNED: 'attendance.read.assigned',
  ATTENDANCE_CREATE: 'attendance.create',
  ATTENDANCE_CREATE_EXCEPTION: 'attendance.create.exception',
  ATTENDANCE_UPDATE: 'attendance.update',
  ATTENDANCE_DELETE: 'attendance.delete',

  // ── Horarios ──────────────────────────────────────────────────────────
  SCHEDULE_READ: 'schedule.read',
  SCHEDULE_CREATE: 'schedule.create',
  SCHEDULE_UPDATE: 'schedule.update',
  SCHEDULE_CAPACITY_OVERRIDE: 'schedule.capacity.override',
  SCHEDULE_BLOCK: 'schedule.block',
  SCHEDULE_CANCEL_SESSION: 'schedule.cancel_session',
  ENROLLMENT_CREATE: 'enrollment.create',
  ENROLLMENT_MOVE: 'enrollment.move',
  ENROLLMENT_DELETE: 'enrollment.delete',

  // ── Entrenadores ──────────────────────────────────────────────────────
  TRAINER_READ: 'trainer.read',
  TRAINER_CREATE: 'trainer.create',
  TRAINER_UPDATE: 'trainer.update',
  TRAINER_ASSIGN_CLIENT: 'trainer.assign_client',

  // ── Inscripciones ─────────────────────────────────────────────────────
  REGISTRATION_READ: 'registration.read',
  REGISTRATION_REVIEW: 'registration.review',
  REGISTRATION_APPROVE: 'registration.approve',
  REGISTRATION_REJECT: 'registration.reject',
  REGISTRATION_MERGE_DUPLICATE: 'registration.merge_duplicate',

  // ── Comunicaciones ────────────────────────────────────────────────────
  MESSAGE_TEMPLATE_READ: 'message.template.read',
  MESSAGE_TEMPLATE_MANAGE: 'message.template.manage',
  MESSAGE_SEND: 'message.send',
  MESSAGE_CAMPAIGN_SEND: 'message.campaign.send',

  // ── Reportes ──────────────────────────────────────────────────────────
  REPORT_OPERATIONAL_READ: 'report.operational.read',
  REPORT_COMMERCIAL_READ: 'report.commercial.read',
  REPORT_FINANCIAL_READ: 'report.financial.read',
  REPORT_EXPORT: 'report.export',

  // ── Configuración ─────────────────────────────────────────────────────
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  SETTINGS_UPDATE_CRITICAL: 'settings.update.critical',
  SETTINGS_INTEGRATIONS_MANAGE: 'settings.integrations.manage',

  // ── Usuarios ──────────────────────────────────────────────────────────
  USER_READ: 'user.read',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DEACTIVATE: 'user.deactivate',
  ROLE_MANAGE: 'role.manage',
  PERMISSION_ASSIGN: 'permission.assign',
  SESSION_REVOKE: 'session.revoke',

  // ── Auditoría ─────────────────────────────────────────────────────────
  AUDIT_READ: 'audit.read',
  AUDIT_EXPORT: 'audit.export',

  // ══ AMPLIACIÓN ════════════════════════════════════════════════════════

  // ── Eventos ───────────────────────────────────────────────────────────
  EVENT_READ: 'event.read',
  EVENT_READ_ASSIGNED: 'event.read.assigned',
  EVENT_CREATE: 'event.create',
  EVENT_UPDATE: 'event.update',
  EVENT_PUBLISH: 'event.publish',
  EVENT_CANCEL: 'event.cancel',
  EVENT_RESCHEDULE: 'event.reschedule',
  EVENT_CATEGORY_MANAGE: 'event.category.manage',
  EVENT_PRICE_MANAGE: 'event.price.manage',
  EVENT_STAFF_MANAGE: 'event.staff.manage',
  EVENT_REGISTRATION_READ: 'event.registration.read',
  EVENT_REGISTRATION_CREATE: 'event.registration.create',
  EVENT_REGISTRATION_CANCEL: 'event.registration.cancel',
  EVENT_REGISTRATION_REFUND: 'event.registration.refund',
  EVENT_REGISTRATION_OVERRIDE_CAPACITY: 'event.registration.override_capacity',
  EVENT_WAITLIST_MANAGE: 'event.waitlist.manage',
  EVENT_ATTENDANCE_CREATE: 'event.attendance.create',
  EVENT_FINANCE_READ: 'event.finance.read',
  EVENT_EXPORT: 'event.export',

  // ── Servicios y derechos ──────────────────────────────────────────────
  SERVICE_READ: 'service.read',
  SERVICE_MANAGE: 'service.manage',
  ENTITLEMENT_READ: 'entitlement.read',
  ENTITLEMENT_GRANT: 'entitlement.grant',
  ENTITLEMENT_ADJUST: 'entitlement.adjust',
  /** Tarjeta rápida del entrenador. Su DTO NO contiene ningún importe. */
  ACCESS_CARD_READ: 'access_card.read',
  SERVICE_USAGE_CREATE: 'service_usage.create',
  AUTHORIZATION_REQUEST: 'authorization.request',
  AUTHORIZATION_APPROVE: 'authorization.approve',
  AUTHORIZATION_READ: 'authorization.read',

  // ── Finanzas ──────────────────────────────────────────────────────────
  FINANCE_DASHBOARD_READ: 'finance.dashboard.read',
  EXPENSE_READ: 'expense.read',
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_UPDATE: 'expense.update',
  EXPENSE_APPROVE: 'expense.approve',
  EXPENSE_VOID: 'expense.void',
  INCOME_CREATE: 'income.create',
  INCOME_VOID: 'income.void',
  PERIOD_READ: 'period.read',
  PERIOD_CLOSE: 'period.close',
  PERIOD_REOPEN: 'period.reopen',
  PROFITABILITY_READ: 'profitability.read',
  FINANCE_EXPORT: 'finance.export',

  // ── Remuneración de entrenadores ──────────────────────────────────────
  TRAINER_RATE_READ: 'trainer.rate.read',
  TRAINER_RATE_MANAGE: 'trainer.rate.manage',
  TRAINER_SERVICE_READ: 'trainer.service.read',
  TRAINER_SERVICE_READ_OWN: 'trainer.service.read.own',
  TRAINER_SERVICE_CREATE: 'trainer.service.create',
  TRAINER_SETTLEMENT_READ: 'trainer.settlement.read',
  /** Única excepción a "el entrenador no ve dinero": ve el suyo. */
  TRAINER_SETTLEMENT_READ_OWN: 'trainer.settlement.read.own',
  TRAINER_SETTLEMENT_GENERATE: 'trainer.settlement.generate',
  TRAINER_SETTLEMENT_APPROVE: 'trainer.settlement.approve',
  TRAINER_SETTLEMENT_PAY: 'trainer.settlement.pay',

  // ── Notificaciones ────────────────────────────────────────────────────
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_ASSIGN: 'notification.assign',
  NOTIFICATION_RESOLVE: 'notification.resolve',
  NOTIFICATION_TYPE_MANAGE: 'notification.type.manage',
  NOTIFICATION_PREFERENCES_MANAGE: 'notification.preferences.manage',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[]

/** Módulo al que pertenece cada permiso, derivado del prefijo del código. */
export function permissionModule(code: Permission): string {
  const root = code.split('.')[0] ?? 'otros'
  const MODULES: Record<string, string> = {
    client: 'Clientes',
    plan: 'Planes',
    membership: 'Membresías',
    charge: 'Pagos',
    payment: 'Pagos',
    receipt: 'Pagos',
    collection: 'Cartera',
    reminder: 'Cartera',
    attendance: 'Asistencia',
    schedule: 'Horarios',
    enrollment: 'Horarios',
    trainer: 'Entrenadores',
    registration: 'Inscripciones',
    message: 'Comunicaciones',
    report: 'Reportes',
    settings: 'Configuración',
    user: 'Usuarios',
    role: 'Usuarios',
    permission: 'Usuarios',
    session: 'Usuarios',
    audit: 'Auditoría',
    event: 'Eventos',
    service: 'Servicios',
    service_usage: 'Servicios',
    entitlement: 'Servicios',
    access_card: 'Servicios',
    authorization: 'Servicios',
    finance: 'Finanzas',
    expense: 'Finanzas',
    income: 'Finanzas',
    period: 'Finanzas',
    profitability: 'Finanzas',
    notification: 'Notificaciones',
  }
  return MODULES[root] ?? 'Otros'
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROLES DEL SEED
   Traducción exacta de la matriz de docs/03-roles-y-permisos.md.
   Se siembran una vez; después son editables desde Configuración.
   ═══════════════════════════════════════════════════════════════════════════ */

export const ROLE_CODES = {
  OWNER: 'OWNER',
  FRONT_DESK: 'FRONT_DESK',
  TRAINER: 'TRAINER',
  CLIENT: 'CLIENT',
} as const

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES]

const P = PERMISSIONS

/** Recepción: opera el día a día. No toca planes, finanzas ni configuración crítica. */
const FRONT_DESK_PERMISSIONS: Permission[] = [
  P.CLIENT_READ, P.CLIENT_CREATE, P.CLIENT_UPDATE, P.CLIENT_NOTE_CREATE,
  P.CLIENT_NOTE_READ_INTERNAL, P.CLIENT_DOCUMENT_READ, P.CLIENT_DOCUMENT_UPLOAD,
  P.PLAN_READ,
  P.MEMBERSHIP_READ, P.MEMBERSHIP_CREATE, P.MEMBERSHIP_RENEW, P.MEMBERSHIP_PAUSE,
  P.CHARGE_READ, P.CHARGE_CREATE,
  P.PAYMENT_READ, P.PAYMENT_CREATE, P.PAYMENT_CREATE_CASH,
  P.RECEIPT_READ, P.RECEIPT_SEND,
  P.COLLECTION_READ, P.COLLECTION_ACTION_CREATE, P.COLLECTION_COMMITMENT_CREATE, P.REMINDER_SEND,
  P.ATTENDANCE_READ, P.ATTENDANCE_CREATE, P.ATTENDANCE_CREATE_EXCEPTION,
  P.SCHEDULE_READ, P.ENROLLMENT_CREATE, P.ENROLLMENT_MOVE, P.SCHEDULE_CANCEL_SESSION,
  P.TRAINER_READ,
  P.REGISTRATION_READ, P.REGISTRATION_REVIEW, P.REGISTRATION_APPROVE,
  P.MESSAGE_TEMPLATE_READ, P.MESSAGE_SEND,
  P.REPORT_OPERATIONAL_READ, P.REPORT_COMMERCIAL_READ,
  P.SETTINGS_READ,
  P.EVENT_READ, P.EVENT_REGISTRATION_READ, P.EVENT_REGISTRATION_CREATE,
  P.EVENT_REGISTRATION_CANCEL, P.EVENT_WAITLIST_MANAGE, P.EVENT_ATTENDANCE_CREATE,
  P.SERVICE_READ, P.ENTITLEMENT_READ, P.ACCESS_CARD_READ, P.SERVICE_USAGE_CREATE,
  P.AUTHORIZATION_REQUEST, P.AUTHORIZATION_READ,
  P.NOTIFICATION_READ, P.NOTIFICATION_RESOLVE, P.NOTIFICATION_PREFERENCES_MANAGE,
]

/**
 * Entrenador: solo lo operativo y solo lo suyo.
 * El alcance (`.assigned`, `.own`) se aplica en el repositorio, no en la vista.
 * P33 · sus clientes son los inscritos en las franjas que cubre, no una lista fija.
 */
const TRAINER_PERMISSIONS: Permission[] = [
  P.CLIENT_READ_ASSIGNED, P.CLIENT_NOTE_CREATE,
  P.PLAN_READ,
  P.MEMBERSHIP_READ_ASSIGNED,
  P.ATTENDANCE_READ_ASSIGNED, P.ATTENDANCE_CREATE,
  P.SCHEDULE_READ,
  P.TRAINER_READ,
  P.EVENT_READ_ASSIGNED, P.EVENT_ATTENDANCE_CREATE,
  P.SERVICE_READ, P.ENTITLEMENT_READ, P.ACCESS_CARD_READ, P.SERVICE_USAGE_CREATE,
  P.AUTHORIZATION_REQUEST, P.AUTHORIZATION_READ,
  P.TRAINER_SERVICE_READ_OWN, P.TRAINER_SETTLEMENT_READ_OWN,
  P.REPORT_OPERATIONAL_READ,
  P.NOTIFICATION_READ, P.NOTIFICATION_RESOLVE, P.NOTIFICATION_PREFERENCES_MANAGE,
]

export const ROLE_SEED: Record<RoleCode, { name: string; description: string; permissions: Permission[] | 'ALL' }> = {
  OWNER: {
    name: 'Propietaria / Administradora',
    description: 'Acceso completo, incluida la configuración crítica y la gestión de permisos.',
    permissions: 'ALL',
  },
  FRONT_DESK: {
    name: 'Recepción',
    description: 'Operación diaria: clientes, pagos presenciales, asistencia y vencimientos.',
    permissions: FRONT_DESK_PERMISSIONS,
  },
  TRAINER: {
    name: 'Entrenador',
    description: 'Solo sus clientes y franjas. Sin información financiera del gimnasio.',
    permissions: TRAINER_PERMISSIONS,
  },
  CLIENT: {
    name: 'Cliente',
    description: 'Portal del miembro. Preparado, sin permisos activos en la v1.',
    permissions: [],
  },
}

/**
 * Acciones que EXIGEN motivo escrito. Se valida en el servicio, no en el formulario.
 * docs/03-roles-y-permisos.md §4.5 · docs/07-reglas-negocio.md RN-92
 */
export const REQUIRES_REASON: readonly Permission[] = [
  P.PAYMENT_VOID, P.PAYMENT_REFUND, P.PAYMENT_DISCOUNT_APPROVE,
  P.MEMBERSHIP_EXTEND, P.MEMBERSHIP_COURTESY_DAYS, P.MEMBERSHIP_CANCEL,
  P.MEMBERSHIP_OVERRIDE_DATES, P.MEMBERSHIP_TRANSFER_BALANCE,
  P.CLIENT_STATUS_OVERRIDE, P.CLIENT_DELETE,
  P.ATTENDANCE_CREATE_EXCEPTION, P.ATTENDANCE_DELETE,
  P.SCHEDULE_CAPACITY_OVERRIDE,
  P.EVENT_CANCEL, P.EVENT_RESCHEDULE, P.EVENT_REGISTRATION_OVERRIDE_CAPACITY,
  P.ENTITLEMENT_ADJUST, P.AUTHORIZATION_APPROVE,
  P.EXPENSE_VOID, P.INCOME_VOID, P.PERIOD_REOPEN,
  P.TRAINER_SETTLEMENT_APPROVE,
  P.PERMISSION_ASSIGN,
] as const
