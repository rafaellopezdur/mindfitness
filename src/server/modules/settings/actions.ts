'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/server/infra/prisma'
import { requirePermission } from '@/server/auth/context'
import { recordChange } from '@/server/audit/audit-service'
import { can } from '@/server/auth/rbac'
import { PERMISSIONS } from '@/shared/constants/permissions'

export interface SettingsFormState {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string>
}

/**
 * Claves editables y su tipo. Solo se puede escribir lo que está aquí: un
 * `formData` manipulado no puede introducir claves nuevas ni tocar las
 * sensibles (llaves de integraciones).
 */
const EDITABLE = {
  'business.name': { group: 'business', type: 'string', critical: false, schema: z.string().min(2).max(80) },
  'business.legal_name': { group: 'business', type: 'string', critical: false, schema: z.string().max(120) },
  'business.tax_id': { group: 'business', type: 'string', critical: false, schema: z.string().max(30) },
  'business.address': { group: 'business', type: 'string', critical: false, schema: z.string().max(160) },
  'business.city': { group: 'business', type: 'string', critical: false, schema: z.string().max(60) },
  'business.phone': { group: 'business', type: 'string', critical: false, schema: z.string().max(30) },
  'business.whatsapp': { group: 'business', type: 'string', critical: false, schema: z.string().max(30) },
  'business.email': { group: 'business', type: 'string', critical: false, schema: z.string().max(120) },

  'rules.expiring_soon_days': { group: 'rules', type: 'number', critical: true, schema: z.coerce.number().int().min(0).max(60) },
  'rules.default_grace_days': { group: 'rules', type: 'number', critical: true, schema: z.coerce.number().int().min(0).max(30) },
  'rules.inactive_after_days': { group: 'rules', type: 'number', critical: true, schema: z.coerce.number().int().min(7).max(730) },
  'rules.month_mode': { group: 'rules', type: 'string', critical: true, schema: z.enum(['CALENDAR', 'FIXED_30_DAYS']) },
  'rules.week_starts_on': { group: 'rules', type: 'string', critical: true, schema: z.enum(['MONDAY', 'SUNDAY']) },
  'rules.weekly_limit_enforcement': { group: 'rules', type: 'string', critical: true, schema: z.enum(['WARN', 'BLOCK', 'OFF']) },
  'rules.entitlement_rollover': { group: 'rules', type: 'boolean', critical: true, schema: z.coerce.boolean() },
  'rules.authorization_mode': { group: 'rules', type: 'string', critical: true, schema: z.enum(['OPERATIONAL', 'STRICT']) },
  'rules.schedule_tolerance_minutes': { group: 'rules', type: 'number', critical: true, schema: z.coerce.number().int().min(0).max(120) },

  'clients.acquisition_channels': {
    group: 'rules',
    type: 'json',
    critical: false,
    // Una lista por líneas es lo natural de escribir en un textarea.
    schema: z
      .string()
      .transform((value) => value.split('\n').map((line) => line.trim()).filter(Boolean))
      .pipe(z.array(z.string().max(60)).max(20)),
  },
} as const

type EditableKey = keyof typeof EDITABLE

export async function updateSettingsAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const actor = await requirePermission(PERMISSIONS.SETTINGS_UPDATE)

  const fieldErrors: Record<string, string> = {}
  const changes: { key: EditableKey; value: unknown }[] = []

  for (const [key, definition] of Object.entries(EDITABLE) as [EditableKey, (typeof EDITABLE)[EditableKey]][]) {
    if (!formData.has(key)) continue

    // Las reglas críticas exigen un permiso distinto al de los datos de contacto.
    if (definition.critical && !can(actor, PERMISSIONS.SETTINGS_UPDATE_CRITICAL)) {
      fieldErrors[key] = 'No tienes permiso para cambiar esta regla'
      continue
    }

    const raw = formData.get(key)
    const parsed = definition.schema.safeParse(
      definition.type === 'boolean' ? raw === 'on' || raw === 'true' : String(raw ?? ''),
    )

    if (!parsed.success) {
      fieldErrors[key] = parsed.error.issues[0]?.message ?? 'Valor inválido'
      continue
    }
    changes.push({ key, value: parsed.data })
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
  if (changes.length === 0) return { ok: false, message: 'No había nada que guardar.' }

  const before = await prisma.businessSetting.findMany({
    where: { key: { in: changes.map((c) => c.key) } },
    select: { key: true, value: true },
  })
  const beforeMap = Object.fromEntries(before.map((row) => [row.key, row.value]))

  await prisma.$transaction(async (tx) => {
    for (const change of changes) {
      const definition = EDITABLE[change.key]
      await tx.businessSetting.upsert({
        where: { key: change.key },
        update: { value: change.value as never, updatedBy: actor.userId },
        create: {
          key: change.key,
          group: definition.group as never,
          type: definition.type as never,
          value: change.value as never,
          updatedBy: actor.userId,
        },
      })
    }

    await recordChange(tx, {
      actor,
      action: 'settings.update',
      entityType: 'business_settings',
      before: beforeMap,
      after: Object.fromEntries(changes.map((c) => [c.key, c.value])),
      severity: changes.some((c) => EDITABLE[c.key].critical) ? 'WARNING' : 'NOTICE',
    })
  })

  // El nombre del gimnasio se lee en la cabecera de todo el panel.
  revalidatePath('/admin', 'layout')

  return { ok: true, message: 'Configuración guardada.' }
}
