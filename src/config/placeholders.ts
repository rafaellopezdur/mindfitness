/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DATOS DE NEGOCIO CENTRALIZADOS
 *
 * Único lugar del código con información comercial de Mind Fitness Club.
 * Nada de esto debe aparecer disperso en componentes ni en servicios.
 *
 *   ✅ CONFIRMADO  → dato real entregado por el cliente
 *   ⚠️ TEMP        → valor provisional; reemplazar sin tocar código
 *
 * En producción estos valores viven en `business_settings` (editables desde
 * el portal administrativo). Este archivo es la SEMILLA inicial y el
 * respaldo cuando una clave no existe todavía en la base de datos.
 *
 * Documentación: docs/15-catalogo-planes.md · docs/09-preguntas-pendientes.md
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Marca un valor como provisional. Buscar `TEMP(` para auditar lo pendiente. */
const TEMP = <T>(value: T, question: string): T => {
  if (process.env.NODE_ENV === 'development') {
    TEMP_REGISTRY.push(question)
  }
  return value
}
export const TEMP_REGISTRY: string[] = []

/* ─────────────────────────────────────────────────────────────
   1 · Negocio
   ───────────────────────────────────────────────────────────── */
export const BUSINESS = {
  name: 'Mind Fitness Club',
  legalName: TEMP('', 'P7 · razón social'),
  taxId: TEMP('', 'P7 · NIT'),
  domain: 'mindfitnessclub.com.co',
  address: TEMP('', 'P7 · dirección'),
  city: TEMP('', 'P7 · ciudad'),
  phone: TEMP('', 'P7 · teléfono'),
  whatsapp: TEMP('', 'P7 · WhatsApp de atención'),
  email: TEMP('hola@mindfitnessclub.com.co', 'P7 · correo de contacto'),
  timezone: 'America/Bogota',
  currency: 'COP',
  /** COP no usa decimales: 1 unidad menor = $1. Ver docs/01-arquitectura.md §7 */
  currencyExponent: 0,
  social: {
    instagram: TEMP('', 'P7 · Instagram'),
    facebook: TEMP('', 'P7 · Facebook'),
    tiktok: TEMP('', 'P7 · TikTok'),
  },
} as const

/* ─────────────────────────────────────────────────────────────
   2 · Reglas operativas  (docs/15-catalogo-planes.md §7)
   ───────────────────────────────────────────────────────────── */
export const RULES = {
  /** ✅ P38 · mes calendario: 15 ago → vence 14 sep (RN-02) */
  monthMode: 'CALENDAR' as 'CALENDAR' | 'FIXED_30_DAYS',
  /** ✅ P31 · la semana del límite va de lunes a domingo */
  weekStartsOn: 'MONDAY' as 'MONDAY' | 'SUNDAY' | 'ROLLING_7',
  /** ✅ P30 · límite blando: se avisa y se registra, no se bloquea */
  weeklyLimitEnforcement: 'WARN' as 'WARN' | 'BLOCK' | 'OFF',
  /** ✅ P32 · los días no usados no se acumulan */
  entitlementRollover: false,
  /** ✅ P37 · sin matrícula */
  enrollmentFee: 0,

  /** Umbral de "próximo a vencer", en días */
  expiringSoonDays: TEMP(5, 'P3 · ¿cuántos días antes se considera por vencer?'),
  /** Días de gracia tras el vencimiento */
  defaultGraceDays: TEMP(0, 'P3 · ¿hay días de gracia? ¿cuántos?'),
  /** Sin membresía vigente durante N días → INACTIVO */
  inactiveAfterDays: 90,
  /** Caducidad de una inscripción sin pagar */
  registrationExpiresHours: 48,
  /** Caducidad de un borrador de inscripción */
  draftExpiresDays: 7,
  /** Retención de cupo durante el checkout */
  slotHoldMinutes: 15,
  /** Retención de cupo de evento tras aceptar una oferta de lista de espera */
  waitlistOfferHours: 12,
  /** Una sola membresía viva por cliente (RN-20) */
  allowMultipleActiveMemberships: false,
  /** ✅ P28 · el entrenador presta el servicio y se aprueba después */
  authorizationMode: 'OPERATIONAL' as 'OPERATIONAL' | 'STRICT',
  /** Escalada de una autorización sin resolver */
  authorizationEscalationHours: 48,
  /** Tolerancia para el check-in fuera de la franja */
  scheduleToleranceMinutes: 30,
} as const

/* ─────────────────────────────────────────────────────────────
   3 · Catálogo de servicios  ✅ CONFIRMADO
   Deriva de la tabla de precios real. docs/15-catalogo-planes.md §3
   ───────────────────────────────────────────────────────────── */
export const SERVICES = [
  {
    code: 'GYM_ACCESS',
    name: 'Acceso al gimnasio',
    description: 'Entrada y uso de las instalaciones',
    kind: 'ACCESS',
    unit: 'SESSION',
    requiresTrainer: false,
    icon: 'dumbbell',
    sortOrder: 1,
  },
  {
    code: 'SEMI_PERSONAL_ADVICE',
    name: 'Asesoría semipersonalizada',
    description: 'Acompañamiento y ajuste de rutina durante el entrenamiento',
    kind: 'TRAINING',
    unit: 'SESSION',
    requiresTrainer: true,
    icon: 'clipboard-check',
    sortOrder: 2,
  },
  {
    code: 'SPECIALIZED_TRAINER',
    name: 'Entrenador especializado',
    // ✅ P33 · es el entrenador de turno, no una persona fija por cliente
    description: 'Atención del entrenador especializado en turno',
    kind: 'TRAINING',
    unit: 'UNLIMITED',
    requiresTrainer: true,
    icon: 'user-check',
    sortOrder: 3,
  },
] as const

/* ─────────────────────────────────────────────────────────────
   4 · Planes  ✅ CONFIRMADO (tabla de precios, 4 ago 2026)
   Importes en unidades menores de COP (exponente 0 → 1 = $1).
   ───────────────────────────────────────────────────────────── */
export const PLANS = [
  {
    slug: 'basico',
    name: 'Plan Básico',
    description: 'Acceso al gimnasio 6 días por semana, sin acompañamiento.',
    price: 175_000,
    durationValue: 1,
    durationUnit: 'MONTH',
    weeklyVisitLimit: 6,
    modality: 'GROUP',
    requiresSchedule: false,
    isPublic: true,
    isRecommended: false,
    allowsOnlineRegistration: true,
    sortOrder: 1,
    benefits: ['6 días por semana', 'Sin asesoría', 'Sin entrenador especializado'],
    entitlements: [
      { service: 'GYM_ACCESS', quantity: 6, period: 'WEEK' },
      // Sin asesoría ni entrenador: la ausencia es información, y así la lee
      // resolveAccess para producir "su plan no incluye acompañamiento".
    ],
  },
  {
    slug: 'semi-pro',
    name: 'Plan Semi-Pro',
    description: 'Tres días por semana con asesoría y entrenador especializado.',
    price: 250_000,
    durationValue: 1,
    durationUnit: 'MONTH',
    weeklyVisitLimit: 3,
    modality: 'SEMI_PERSONAL',
    requiresSchedule: false,
    isPublic: true,
    isRecommended: true, // ⭐ cinta "RECOMENDADO" de la tabla de precios
    allowsOnlineRegistration: true,
    sortOrder: 2,
    benefits: ['3 días por semana', 'Asesoría semipersonalizada', 'Entrenador especializado'],
    entitlements: [
      { service: 'GYM_ACCESS', quantity: 3, period: 'WEEK' },
      // ⚠️ P34 · lectura (a): cada visita va acompañada.
      // Si son revisiones puntuales al mes, cambiar a { quantity: N, period: 'MONTH' }.
      {
        service: 'SEMI_PERSONAL_ADVICE',
        quantity: TEMP(3, 'P34 · ¿la asesoría es 3/semana o N revisiones/mes?'),
        period: 'WEEK',
      },
      { service: 'SPECIALIZED_TRAINER', quantity: null, period: 'TOTAL' },
    ],
  },
  {
    slug: 'pro',
    name: 'Plan Pro',
    description: 'Seis días por semana con asesoría y entrenador especializado.',
    price: 315_000,
    durationValue: 1,
    durationUnit: 'MONTH',
    weeklyVisitLimit: 6,
    modality: 'SEMI_PERSONAL',
    requiresSchedule: false,
    isPublic: true,
    isRecommended: false,
    allowsOnlineRegistration: true,
    sortOrder: 3,
    benefits: ['6 días por semana', 'Asesoría semipersonalizada', 'Entrenador especializado'],
    entitlements: [
      { service: 'GYM_ACCESS', quantity: 6, period: 'WEEK' },
      {
        service: 'SEMI_PERSONAL_ADVICE',
        quantity: TEMP(6, 'P34 · ¿la asesoría es 6/semana o N revisiones/mes?'),
        period: 'WEEK',
      },
      { service: 'SPECIALIZED_TRAINER', quantity: null, period: 'TOTAL' },
    ],
  },
  {
    slug: 'pase-diario',
    name: 'Pase diario',
    description: 'Un día de acceso con asesoría incluida.',
    price: 27_000,
    durationValue: 1,
    durationUnit: 'DAY',
    sessionLimit: 1,
    modality: 'OPEN',
    requiresSchedule: false,
    // ✅ P35 · producto de mostrador: no compite en la tabla pública
    isPublic: false,
    isRecommended: false,
    allowsOnlineRegistration: false,
    sortOrder: 4,
    benefits: ['1 día de acceso', 'Asesoría incluida'],
    entitlements: [
      { service: 'GYM_ACCESS', quantity: 1, period: 'TOTAL' },
      { service: 'SEMI_PERSONAL_ADVICE', quantity: 1, period: 'TOTAL' }, // ✅ P35
      { service: 'SPECIALIZED_TRAINER', quantity: null, period: 'TOTAL' },
    ],
  },
] as const

/**
 * Punto de equilibrio del pase diario frente al plan más barato.
 * 175.000 / 27.000 = 6,5 → a partir de la 7ª visita del mes conviene el Básico.
 * Alimenta la sugerencia de conversión en recepción (candidata a v1.1).
 */
export const DAY_PASS_BREAK_EVEN = Math.ceil(175_000 / 27_000)

/* ─────────────────────────────────────────────────────────────
   5 · Métodos de pago
   ───────────────────────────────────────────────────────────── */
export const PAYMENT_METHODS = [
  { code: 'CASH', name: 'Efectivo', requiresReference: false, requiresProof: false, isOnline: false },
  { code: 'TRANSFER', name: 'Transferencia', requiresReference: true, requiresProof: true, isOnline: false },
  { code: 'CARD_TERMINAL', name: 'Datáfono', requiresReference: true, requiresProof: false, isOnline: false },
  { code: 'ONLINE', name: 'Pago en línea', requiresReference: false, requiresProof: false, isOnline: true },
  { code: 'OTHER', name: 'Otro', requiresReference: false, requiresProof: false, isOnline: false },
] as const

/* ─────────────────────────────────────────────────────────────
   6 · Pendientes
   ───────────────────────────────────────────────────────────── */
export const SCHEDULE_SLOTS = TEMP([], 'P5 · franjas horarias reales, capacidad y entrenador')
export const LEGAL_TEXTS = {
  terms: TEMP('', 'P6 · términos y condiciones'),
  privacy: TEMP('', 'P6 · política de privacidad'),
  dataProcessing: TEMP('', 'P6 · autorización de tratamiento de datos (Ley 1581)'),
} as const
