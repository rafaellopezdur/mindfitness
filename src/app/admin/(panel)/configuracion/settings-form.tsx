'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Lock } from 'lucide-react'
import { updateSettingsAction, type SettingsFormState } from '@/server/modules/settings/actions'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

const INITIAL: SettingsFormState = { ok: false }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </Button>
  )
}

export interface SettingsValues {
  business: Record<string, string>
  rules: Record<string, string | number | boolean>
  channels: string[]
}

export function SettingsForm({
  section,
  values,
  canEditCritical,
}: {
  section: string
  values: SettingsValues
  canEditCritical: boolean
}) {
  const [state, formAction] = useActionState(updateSettingsAction, INITIAL)

  return (
    <form action={formAction} className="max-w-2xl space-y-5" noValidate>
      {state.message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2.5 text-sm ${state.ok ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}
        >
          {state.message}
        </p>
      )}

      {section === 'negocio' && (
        <section className="space-y-4 rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-5">
          <div>
            <h2 className="text-sm font-semibold text-[--color-text]">Información del gimnasio</h2>
            <p className="mt-0.5 text-xs text-[--color-text-muted]">
              Estos datos aparecen en el panel, los correos y el portal público.
            </p>
          </div>

          <Field label="Nombre" htmlFor="business.name" error={state.fieldErrors?.['business.name']}>
            <Input id="business.name" name="business.name" defaultValue={values.business['business.name']} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Razón social" htmlFor="business.legal_name">
              <Input id="business.legal_name" name="business.legal_name" defaultValue={values.business['business.legal_name']} />
            </Field>
            <Field label="NIT" htmlFor="business.tax_id">
              <Input id="business.tax_id" name="business.tax_id" defaultValue={values.business['business.tax_id']} />
            </Field>
            <Field label="Dirección" htmlFor="business.address">
              <Input id="business.address" name="business.address" defaultValue={values.business['business.address']} />
            </Field>
            <Field label="Ciudad" htmlFor="business.city">
              <Input id="business.city" name="business.city" defaultValue={values.business['business.city']} />
            </Field>
            <Field label="Teléfono" htmlFor="business.phone">
              <Input id="business.phone" name="business.phone" defaultValue={values.business['business.phone']} />
            </Field>
            <Field label="WhatsApp" htmlFor="business.whatsapp">
              <Input id="business.whatsapp" name="business.whatsapp" defaultValue={values.business['business.whatsapp']} />
            </Field>
          </div>
          <Field label="Correo de contacto" htmlFor="business.email">
            <Input id="business.email" name="business.email" type="email" defaultValue={values.business['business.email']} />
          </Field>
        </section>
      )}

      {section === 'reglas' && (
        <section className="space-y-4 rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[--color-text]">
              Reglas de vencimiento y acceso
              {!canEditCritical && <Lock className="size-3.5 text-[--color-text-muted]" aria-hidden />}
            </h2>
            <p className="mt-0.5 text-xs text-[--color-text-muted]">
              {canEditCritical
                ? 'Cambiarlas afecta a cómo se calculan los estados de todas las membresías. Queda registrado en la auditoría.'
                : 'Solo una propietaria puede modificar estas reglas.'}
            </p>
          </div>

          <fieldset disabled={!canEditCritical} className="space-y-4 disabled:opacity-60">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Días para avisar de vencimiento"
                htmlFor="rules.expiring_soon_days"
                error={state.fieldErrors?.['rules.expiring_soon_days']}
                hint="Una membresía se marca «próxima a vencer» con esta antelación."
              >
                <Input
                  id="rules.expiring_soon_days"
                  name="rules.expiring_soon_days"
                  type="number"
                  min={0}
                  max={60}
                  defaultValue={String(values.rules['rules.expiring_soon_days'])}
                />
              </Field>

              <Field
                label="Días de gracia"
                htmlFor="rules.default_grace_days"
                error={state.fieldErrors?.['rules.default_grace_days']}
                hint="Días que aún se permite entrar tras el vencimiento."
              >
                <Input
                  id="rules.default_grace_days"
                  name="rules.default_grace_days"
                  type="number"
                  min={0}
                  max={30}
                  defaultValue={String(values.rules['rules.default_grace_days'])}
                />
              </Field>
            </div>

            <Field
              label="Duración de un plan mensual"
              htmlFor="rules.month_mode"
              hint="Calendario: del 15 de agosto vence el 14 de septiembre."
            >
              <select
                id="rules.month_mode"
                name="rules.month_mode"
                defaultValue={String(values.rules['rules.month_mode'])}
                className="min-h-11 w-full rounded-lg border border-[--color-border-strong] bg-[--color-surface-raised] px-3 text-sm text-[--color-text]"
              >
                <option value="CALENDAR">Mes calendario</option>
                <option value="FIXED_30_DAYS">30 días exactos</option>
              </select>
            </Field>

            <Field
              label="Si supera sus días por semana"
              htmlFor="rules.weekly_limit_enforcement"
              hint="Avisar deja entrar y registra el exceso; bloquear impide la entrada."
            >
              <select
                id="rules.weekly_limit_enforcement"
                name="rules.weekly_limit_enforcement"
                defaultValue={String(values.rules['rules.weekly_limit_enforcement'])}
                className="min-h-11 w-full rounded-lg border border-[--color-border-strong] bg-[--color-surface-raised] px-3 text-sm text-[--color-text]"
              >
                <option value="WARN">Avisar y registrar</option>
                <option value="BLOCK">Bloquear la entrada</option>
                <option value="OFF">No controlar</option>
              </select>
            </Field>

            <Field
              label="Servicios no incluidos en el plan"
              htmlFor="rules.authorization_mode"
              hint="Operativo: el entrenador puede prestarlo y se aprueba después."
            >
              <select
                id="rules.authorization_mode"
                name="rules.authorization_mode"
                defaultValue={String(values.rules['rules.authorization_mode'])}
                className="min-h-11 w-full rounded-lg border border-[--color-border-strong] bg-[--color-surface-raised] px-3 text-sm text-[--color-text]"
              >
                <option value="OPERATIONAL">Operativo · prestar y aprobar después</option>
                <option value="STRICT">Estricto · esperar la aprobación</option>
              </select>
            </Field>

            <label className="flex items-start gap-2 text-sm text-[--color-text]">
              <input
                type="checkbox"
                name="rules.entitlement_rollover"
                defaultChecked={Boolean(values.rules['rules.entitlement_rollover'])}
                className="mt-0.5 size-4 accent-[--color-brand-500]"
              />
              <span>
                Los días o sesiones no usados pasan al periodo siguiente
                <span className="block text-xs text-[--color-text-muted]">
                  Desactivado, lo no usado se pierde al renovar.
                </span>
              </span>
            </label>
          </fieldset>
        </section>
      )}

      {section === 'clientes' && (
        <section className="space-y-4 rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-5">
          <div>
            <h2 className="text-sm font-semibold text-[--color-text]">Canales de adquisición</h2>
            <p className="mt-0.5 text-xs text-[--color-text-muted]">
              Opciones de «¿cómo nos conoció?» en la ficha del cliente. Una por línea.
            </p>
          </div>
          <Field
            label="Canales"
            htmlFor="clients.acquisition_channels"
            error={state.fieldErrors?.['clients.acquisition_channels']}
          >
            <textarea
              id="clients.acquisition_channels"
              name="clients.acquisition_channels"
              rows={7}
              defaultValue={values.channels.join('\n')}
              className="block w-full rounded-lg border border-[--color-border-strong] bg-[--color-surface-raised] px-3 py-2 text-sm text-[--color-text]"
            />
          </Field>
        </section>
      )}

      <Submit />
    </form>
  )
}
