import { z } from 'zod'
import { isValidColombianMobile, normalizeDocument, normalizePhone, validateDocument } from '@/server/domain/clients'

/**
 * Esquemas de cliente compartidos entre el formulario y el servidor.
 *
 * RN-86 · Los datos MÍNIMOS para crear un cliente son nombre, documento y
 * teléfono. Todo lo demás es opcional y se completa después: en recepción,
 * cada campo obligatorio de más es una persona esperando de pie.
 */

const DOCUMENT_TYPES = ['CC', 'CE', 'TI', 'PA', 'NIT', 'PEP', 'PPT'] as const

const optionalString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v.trim() : undefined))

const nameField = (label: string) =>
  z
    .string()
    .min(2, `${label} debe tener al menos 2 letras`)
    .max(60)
    .transform((v) => v.trim().replace(/\s+/g, ' '))

/** Núcleo compartido por la creación rápida y la completa. */
const clientCore = z.object({
  firstName: nameField('El nombre'),
  lastName: nameField('El apellido'),
  documentType: z.enum(DOCUMENT_TYPES, { errorMap: () => ({ message: 'Elige el tipo de documento' }) }),
  documentNumber: z.string().min(1, 'Escribe el número de documento'),
  phone: z.string().min(1, 'Escribe el teléfono'),
})

/** Comprueba documento y teléfono con las reglas colombianas reales. */
function refineContact<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data: z.infer<typeof clientCore>, ctx: z.RefinementCtx) => {
    const doc = validateDocument(data.documentType, data.documentNumber)
    if (!doc.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['documentNumber'], message: doc.message })
    }
    if (!isValidColombianMobile(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'Escribe un teléfono válido (celular de 10 dígitos o fijo)',
      })
    }
  })
}

/** Alta rápida en el mostrador: 5 campos, menos de 90 segundos. */
export const quickClientSchema = refineContact(clientCore)

export const fullClientSchema = refineContact(
  clientCore.extend({
    birthDate: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Fecha inválida')
      .refine((v) => !v || new Date(v) < new Date(), 'La fecha de nacimiento no puede ser futura')
      .transform((v) => v || undefined),
    gender: optionalString(30),
    whatsapp: optionalString(30),
    email: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || z.string().email().safeParse(v).success, 'Ese correo no parece válido')
      .transform((v) => (v ? v.trim().toLowerCase() : undefined)),
    address: optionalString(160),
    city: optionalString(60),
    acquisitionChannel: optionalString(60),
    emergencyName: optionalString(80),
    emergencyRelationship: optionalString(40),
    emergencyPhone: optionalString(30),
    notes: optionalString(1000),
  }),
).superRefine((data, ctx) => {
  // Un contacto de emergencia sin teléfono no sirve para nada.
  if (data.emergencyName && !data.emergencyPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['emergencyPhone'],
      message: 'Falta el teléfono del contacto de emergencia',
    })
  }
})

export type QuickClientInput = z.infer<typeof quickClientSchema>
export type FullClientInput = z.infer<typeof fullClientSchema>

/** Edición de datos de contacto. El documento se edita aparte, con permiso. */
export const updateClientSchema = z.object({
  clientId: z.string().uuid(),
  firstName: nameField('El nombre'),
  lastName: nameField('El apellido'),
  phone: z.string().refine(isValidColombianMobile, 'Teléfono inválido'),
  whatsapp: optionalString(30),
  email: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || z.string().email().safeParse(v).success, 'Ese correo no parece válido')
    .transform((v) => (v ? v.trim().toLowerCase() : undefined)),
  address: optionalString(160),
  city: optionalString(60),
  birthDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  acquisitionChannel: optionalString(60),
})

/** Cambio de documento: dato sensible, permiso aparte (matriz de permisos). */
export const updateDocumentSchema = z.object({
  clientId: z.string().uuid(),
  documentType: z.enum(DOCUMENT_TYPES),
  documentNumber: z.string().min(1),
  reason: z.string().min(5, 'Explica por qué se corrige el documento'),
})

export const addNoteSchema = z.object({
  clientId: z.string().uuid(),
  body: z.string().min(3, 'Escribe la observación').max(1000),
  visibility: z.enum(['INTERNAL', 'TRAINER']).default('INTERNAL'),
})

export const overrideStatusSchema = z.object({
  clientId: z.string().uuid(),
  status: z.enum(['BLOCKED', 'INACTIVE', 'NONE']),
  reason: z.string().min(5, 'El cambio de estado exige un motivo'),
})

export { normalizeDocument, normalizePhone }
