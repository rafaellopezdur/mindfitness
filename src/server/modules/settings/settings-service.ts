import 'server-only'
import { cache } from 'react'
import { prisma } from '@/server/infra/prisma'
import { BUSINESS, RULES } from '@/config/placeholders'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURACIÓN
 *
 * Toda regla operativa se lee de `business_settings`, nunca de una constante
 * incrustada en el código (principio 4 del proyecto). `config/placeholders.ts`
 * es solo la SEMILLA y el respaldo si una clave todavía no existe.
 *
 * La lectura se memoriza por petición con `cache()`: la cabecera, el pie y
 * cada página comparten una sola consulta.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const getSettings = cache(async (): Promise<Map<string, unknown>> => {
  const rows = await prisma.businessSetting.findMany({ select: { key: true, value: true } })
  return new Map(rows.map((row) => [row.key, row.value]))
})

/** Lee una clave con respaldo si aún no está sembrada. */
export async function setting<T>(key: string, fallback: T): Promise<T> {
  const settings = await getSettings()
  const value = settings.get(key)
  return value === undefined || value === null ? fallback : (value as T)
}

/** Datos del negocio que consumen la cabecera, los correos y el portal público. */
export const getBusinessInfo = cache(async () => {
  const settings = await getSettings()
  const read = (key: string, fallback: string) => (settings.get(key) as string) || fallback

  return {
    name: read('business.name', BUSINESS.name),
    legalName: read('business.legal_name', BUSINESS.legalName),
    taxId: read('business.tax_id', BUSINESS.taxId),
    address: read('business.address', BUSINESS.address),
    city: read('business.city', BUSINESS.city),
    phone: read('business.phone', BUSINESS.phone),
    whatsapp: read('business.whatsapp', BUSINESS.whatsapp),
    email: read('business.email', BUSINESS.email),
  }
})

/** Reglas operativas configurables. Ver docs/15-catalogo-planes.md §7. */
export const getRules = cache(async () => {
  const settings = await getSettings()
  const num = (key: string, fallback: number) => {
    const value = settings.get(key)
    return typeof value === 'number' ? value : fallback
  }
  const str = <T extends string>(key: string, fallback: T) => (settings.get(key) as T) ?? fallback
  const bool = (key: string, fallback: boolean) => {
    const value = settings.get(key)
    return typeof value === 'boolean' ? value : fallback
  }

  return {
    monthMode: str('rules.month_mode', RULES.monthMode),
    weekStartsOn: str('rules.week_starts_on', RULES.weekStartsOn),
    weeklyLimitEnforcement: str('rules.weekly_limit_enforcement', RULES.weeklyLimitEnforcement),
    entitlementRollover: bool('rules.entitlement_rollover', RULES.entitlementRollover),
    authorizationMode: str('rules.authorization_mode', RULES.authorizationMode),
    expiringSoonDays: num('rules.expiring_soon_days', RULES.expiringSoonDays),
    defaultGraceDays: num('rules.default_grace_days', RULES.defaultGraceDays),
    inactiveAfterDays: num('rules.inactive_after_days', RULES.inactiveAfterDays),
    slotHoldMinutes: num('rules.slot_hold_minutes', RULES.slotHoldMinutes),
    scheduleToleranceMinutes: num('rules.schedule_tolerance_minutes', RULES.scheduleToleranceMinutes),
  }
})

/** Canales de adquisición: catálogo editable, no un enum en el código. */
export const getAcquisitionChannels = cache(async (): Promise<string[]> => {
  const value = await setting<string[]>('clients.acquisition_channels', [
    'Referido',
    'Instagram',
    'Pasó por el local',
    'WhatsApp',
    'Google',
    'Otro',
  ])
  return Array.isArray(value) ? value : []
})

/** Tipos de documento que se pueden adjuntar a la ficha del cliente. */
export const getDocumentTypes = cache(async (): Promise<string[]> => {
  const value = await setting<string[]>('clients.document_types', [
    'Documento de identidad',
    'Certificado médico',
    'Consentimiento firmado',
    'Otro',
  ])
  return Array.isArray(value) ? value : []
})
