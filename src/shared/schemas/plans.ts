import { z } from 'zod'

/**
 * Esquemas de planes.
 *
 * Un plan NO tiene tipo: se construye combinando reglas. Los diez tipos
 * solicitados (mensual, por sesiones, semipersonalizado, de prueba…) salen de
 * estos campos, no de un enum cerrado.
 */

export const DURATION_UNITS = ['DAY', 'WEEK', 'MONTH', 'YEAR'] as const
export const MODALITIES = ['OPEN', 'GROUP', 'SEMI_PERSONAL', 'PERSONAL'] as const
export const PLAN_STATUSES = ['DRAFT', 'ACTIVE', 'HIDDEN', 'ARCHIVED'] as const
export const ENTITLEMENT_PERIODS = ['TOTAL', 'DAY', 'WEEK', 'MONTH'] as const

export const MODALITY_LABELS: Record<(typeof MODALITIES)[number], string> = {
  OPEN: 'Acceso libre',
  GROUP: 'Grupal',
  SEMI_PERSONAL: 'Semipersonalizado',
  PERSONAL: 'Personalizado',
}

export const DURATION_LABELS: Record<(typeof DURATION_UNITS)[number], string> = {
  DAY: 'días',
  WEEK: 'semanas',
  MONTH: 'meses',
  YEAR: 'años',
}

export const PLAN_STATUS_LABELS: Record<(typeof PLAN_STATUSES)[number], string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  HIDDEN: 'Oculto',
  ARCHIVED: 'Archivado',
}

export const PERIOD_LABELS: Record<(typeof ENTITLEMENT_PERIODS)[number], string> = {
  TOTAL: 'en total',
  DAY: 'al día',
  WEEK: 'por semana',
  MONTH: 'al mes',
}

const optionalInt = (max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === '' || value === null) return undefined
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    })
    .refine((value) => value === undefined || (value >= 0 && value <= max), `Valor fuera de rango`)

export const planSchema = z
  .object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 letras').max(80),
    description: z.string().max(400).optional().or(z.literal('')),
    price: z
      .union([z.string(), z.number()])
      .transform((value) => Number(String(value).replace(/[^\d]/g, '')))
      .refine((value) => Number.isFinite(value) && value >= 0, 'Escribe un precio válido'),

    durationValue: optionalInt(120),
    durationUnit: z.enum(DURATION_UNITS).optional().or(z.literal('')),
    sessionLimit: optionalInt(500),

    weeklyVisitLimit: optionalInt(7),
    dailyVisitLimit: optionalInt(10),

    modality: z.enum(MODALITIES),
    requiresSchedule: z.coerce.boolean().optional(),
    maxCapacity: optionalInt(500),
    graceDays: optionalInt(60),

    isPublic: z.coerce.boolean().optional(),
    isRecommended: z.coerce.boolean().optional(),
    allowsOnlineRegistration: z.coerce.boolean().optional(),
    allowsDiscount: z.coerce.boolean().optional(),

    status: z.enum(PLAN_STATUSES).default('DRAFT'),
    benefits: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    // RN-14 · Un plan necesita al menos un mecanismo de agotamiento: si no,
    // se vende algo que no termina nunca.
    const hasDuration = Boolean(data.durationValue && data.durationUnit)
    const hasSessions = Boolean(data.sessionLimit)
    if (!hasDuration && !hasSessions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationValue'],
        message: 'Indica una duración o un número de sesiones',
      })
    }
    // RN-15 · Lo público se muestra a desconocidos: no puede ir a medias.
    if (data.isPublic && !data.description) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'Un plan visible en la web necesita descripción',
      })
    }
  })

export type PlanInput = z.infer<typeof planSchema>

export const planEntitlementSchema = z.object({
  serviceId: z.string().uuid(),
  included: z.coerce.boolean(),
  quantity: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === '' || value === null) return null
      const parsed = Number(value)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null
    }),
  period: z.enum(ENTITLEMENT_PERIODS).default('TOTAL'),
})

export const archivePlanSchema = z.object({
  planId: z.string().uuid(),
  reason: z.string().min(5, 'Explica por qué se archiva'),
})
