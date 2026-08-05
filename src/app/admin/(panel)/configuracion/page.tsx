import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/server/auth/context'
import { can } from '@/server/auth/rbac'
import { PERMISSIONS } from '@/shared/constants/permissions'
import {
  getAcquisitionChannels,
  getBusinessInfo,
  getRules,
} from '@/server/modules/settings/settings-service'
import { PageHeader } from '@/components/patterns/page-header'
import { EmptyState } from '@/components/patterns/empty-state'
import { cn } from '@/lib/cn'
import { SettingsForm } from './settings-form'

export const metadata: Metadata = { title: 'Configuración' }

const SECTIONS = [
  { key: 'negocio', label: 'Negocio' },
  { key: 'reglas', label: 'Reglas' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'legal', label: 'Legal' },
  { key: 'integraciones', label: 'Integraciones' },
] as const

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>
}) {
  const actor = await requirePermission(PERMISSIONS.SETTINGS_READ, '/admin/configuracion')
  const { s } = await searchParams
  const section = SECTIONS.find((item) => item.key === s)?.key ?? 'negocio'

  const [business, rules, channels] = await Promise.all([
    getBusinessInfo(),
    getRules(),
    getAcquisitionChannels(),
  ])

  const canEdit = can(actor, PERMISSIONS.SETTINGS_UPDATE)
  const canEditCritical = can(actor, PERMISSIONS.SETTINGS_UPDATE_CRITICAL)

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Los datos y reglas del gimnasio. Nada de esto está escrito en el código."
      />

      <nav aria-label="Secciones de configuración" className="mb-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1 border-b border-line">
          {SECTIONS.map((item) => (
            <li key={item.key}>
              <Link
                href={`/admin/configuracion?s=${item.key}` as Route}
                aria-current={section === item.key ? 'page' : undefined}
                className={cn(
                  'inline-block border-b-2 px-3 py-2 text-sm transition-colors',
                  section === item.key
                    ? 'border-brand-500 font-medium text-brand-700'
                    : 'border-transparent text-ink-soft hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!canEdit && (
        <p className="mb-5 rounded-lg bg-info-surface px-4 py-3 text-sm text-info">
          Puedes consultar la configuración, pero no modificarla.
        </p>
      )}

      {section === 'legal' && (
        <EmptyState
          title="Textos legales pendientes"
          description="Términos y condiciones, política de privacidad y autorización de tratamiento de datos (Ley 1581). Están sin redactar: es la pregunta P6, y deben revisarse antes de salir a producción."
        />
      )}

      {section === 'integraciones' && (
        <EmptyState
          title="Sin integraciones configuradas"
          description="Proveedor de pagos, correo transaccional y almacenamiento de archivos. Las llaves nunca se muestran completas y solo las gestiona una propietaria. Pendiente de las preguntas P1, P9 y P13."
        />
      )}

      {(section === 'negocio' || section === 'reglas' || section === 'clientes') &&
        (canEdit ? (
          <SettingsForm
            section={section}
            canEditCritical={canEditCritical}
            values={{
              business: {
                'business.name': business.name,
                'business.legal_name': business.legalName,
                'business.tax_id': business.taxId,
                'business.address': business.address,
                'business.city': business.city,
                'business.phone': business.phone,
                'business.whatsapp': business.whatsapp,
                'business.email': business.email,
              },
              rules: {
                'rules.expiring_soon_days': rules.expiringSoonDays,
                'rules.default_grace_days': rules.defaultGraceDays,
                'rules.inactive_after_days': rules.inactiveAfterDays,
                'rules.month_mode': rules.monthMode,
                'rules.week_starts_on': rules.weekStartsOn,
                'rules.weekly_limit_enforcement': rules.weeklyLimitEnforcement,
                'rules.entitlement_rollover': rules.entitlementRollover,
                'rules.authorization_mode': rules.authorizationMode,
                'rules.schedule_tolerance_minutes': rules.scheduleToleranceMinutes,
              },
              channels,
            }}
          />
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-ink-soft">
            <p>Nombre: {business.name}</p>
            <p className="mt-1">Vencimiento: aviso {rules.expiringSoonDays} días antes</p>
            <p className="mt-1">Gracia: {rules.defaultGraceDays} días</p>
          </div>
        ))}
    </>
  )
}
