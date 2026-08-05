'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Info, Sparkles } from 'lucide-react'
import {
  createPlanAction,
  updatePlanAction,
  type PlanFormState,
} from '@/server/modules/plans/actions'
import {
  DURATION_LABELS,
  DURATION_UNITS,
  ENTITLEMENT_PERIODS,
  MODALITIES,
  MODALITY_LABELS,
  PERIOD_LABELS,
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
} from '@/shared/schemas/plans'
import type { PlanView } from '@/server/modules/plans/plan-service'
import { Button } from '@/components/ui/button'
import { Field, FormSection, Input, Textarea } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { cn, formatMoney } from '@/lib/cn'

const INITIAL: PlanFormState = { ok: false }

interface ServiceOption {
  id: string
  code: string
  name: string
  description: string | null
  requiresTrainer: boolean
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Guardando…' : label}
    </Button>
  )
}

/**
 * Constructor de planes.
 *
 * No hay un selector de «tipo de plan»: el tipo EMERGE de las reglas. Mensual,
 * por sesiones, semipersonalizado o de prueba son combinaciones de duración,
 * límite de sesiones, modalidad y precio — no clases distintas.
 */
export function PlanForm({
  services,
  plan,
}: {
  services: ServiceOption[]
  plan?: PlanView
}) {
  const [state, formAction] = useActionState(plan ? updatePlanAction : createPlanAction, INITIAL)
  const [price, setPrice] = useState(String(plan?.price ?? ''))

  const included = new Map(plan?.entitlements.map((entitlement) => [entitlement.serviceId, entitlement]))

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {plan && <input type="hidden" name="planId" value={plan.id} />}

      {state.message && (
        <p
          role={state.ok ? 'status' : 'alert'}
          className={cn(
            'animate-fade rounded-lg px-3.5 py-2.5 text-sm',
            state.ok ? 'bg-ok-surface text-ok' : 'bg-risk-surface text-risk',
          )}
        >
          {state.message}
        </p>
      )}

      <FormSection title="Identidad" description="Lo que verá quien compare planes.">
        <Field label="Nombre" htmlFor="name" error={state.fieldErrors?.name} required>
          <Input id="name" name="name" defaultValue={plan?.name} required autoFocus />
        </Field>

        <Field
          label="Descripción"
          htmlFor="description"
          error={state.fieldErrors?.description}
          hint="Obligatoria si el plan se muestra en la web."
        >
          <Textarea id="description" name="description" rows={2} defaultValue={plan?.description ?? ''} />
        </Field>

        <Field
          label="Precio"
          htmlFor="price"
          error={state.fieldErrors?.price}
          hint={price ? formatMoney(Number(price.replace(/\D/g, '') || 0)) : 'En pesos, sin puntos ni decimales.'}
          required
        >
          <Input
            id="price"
            name="price"
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </Field>
      </FormSection>

      <FormSection
        title="Vigencia"
        description="Todo plan necesita una forma de agotarse: por tiempo, por sesiones o por ambas."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Duración" htmlFor="durationValue" error={state.fieldErrors?.durationValue}>
            <Input
              id="durationValue"
              name="durationValue"
              type="number"
              min={1}
              defaultValue={plan?.durationValue ?? ''}
              placeholder="1"
            />
          </Field>
          <Field label="Unidad" htmlFor="durationUnit">
            <Select
              id="durationUnit"
              name="durationUnit"
              defaultValue={plan?.durationUnit ?? 'MONTH'}
              options={DURATION_UNITS.map((unit) => ({ value: unit, label: DURATION_LABELS[unit] }))}
            />
          </Field>
          <Field
            label="Sesiones incluidas"
            htmlFor="sessionLimit"
            hint="Solo para planes por sesiones."
          >
            <Input
              id="sessionLimit"
              name="sessionLimit"
              type="number"
              min={1}
              defaultValue={plan?.sessionLimit ?? ''}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Días por semana" htmlFor="weeklyVisitLimit" hint="Vacío = sin límite.">
            <Input
              id="weeklyVisitLimit"
              name="weeklyVisitLimit"
              type="number"
              min={1}
              max={7}
              defaultValue={plan?.weeklyVisitLimit ?? ''}
            />
          </Field>
          <Field label="Entradas por día" htmlFor="dailyVisitLimit">
            <Input
              id="dailyVisitLimit"
              name="dailyVisitLimit"
              type="number"
              min={1}
              defaultValue={plan?.dailyVisitLimit ?? 1}
            />
          </Field>
          <Field label="Días de gracia" htmlFor="graceDays" hint="Tras vencer.">
            <Input id="graceDays" name="graceDays" type="number" min={0} defaultValue={plan?.graceDays ?? 0} />
          </Field>
        </div>
      </FormSection>

      {/* ── El corazón del plan ───────────────────────────────────────── */}
      <FormSection
        title="Qué incluye"
        description="Es lo que verá el entrenador al consultar a un cliente. Sin esto, «activo» no dice nada útil."
      >
        <ul className="space-y-2">
          {services.map((service) => {
            const current = included.get(service.id)
            return (
              <li key={service.id}>
                <input type="hidden" name="entitlementService" value={service.id} />
                <ServiceRow service={service} current={current} />
              </li>
            )
          })}
        </ul>

        <p className="flex items-start gap-2 rounded-lg bg-info-surface px-3 py-2.5 text-xs text-info">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Al editar un plan, los cambios <strong>no afectan</strong> a las membresías ya vendidas: cada
            una guarda su propia copia congelada de estas condiciones.
          </span>
        </p>
      </FormSection>

      <FormSection title="Modalidad y publicación">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modalidad" htmlFor="modality" hint="Etiqueta comercial, no la regla de acceso.">
            <Select
              id="modality"
              name="modality"
              defaultValue={plan?.modality ?? 'OPEN'}
              options={MODALITIES.map((modality) => ({
                value: modality,
                label: MODALITY_LABELS[modality],
              }))}
            />
          </Field>
          <Field label="Estado" htmlFor="status">
            <Select
              id="status"
              name="status"
              defaultValue={plan?.status ?? 'DRAFT'}
              options={PLAN_STATUSES.filter((status) => status !== 'ARCHIVED').map((status) => ({
                value: status,
                label: PLAN_STATUS_LABELS[status],
              }))}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <Toggle
            name="requiresSchedule"
            defaultChecked={plan?.requiresSchedule}
            label="Exige elegir horario"
            hint="No se podrá crear la membresía sin asignar una franja."
          />
          <Toggle
            name="isPublic"
            defaultChecked={plan?.isPublic}
            label="Visible en la web"
            hint="Aparece en el catálogo público y en el comparador."
          />
          <Toggle
            name="isRecommended"
            defaultChecked={plan?.isRecommended}
            label="Marcar como recomendado"
            hint="Solo un plan puede llevar la cinta. Al activarlo aquí, se quita del anterior."
            icon={<Sparkles className="size-3.5 text-brand-600" aria-hidden />}
          />
          <Toggle
            name="allowsOnlineRegistration"
            defaultChecked={plan?.allowsOnlineRegistration}
            label="Permite inscripción en línea"
          />
          <Toggle
            name="allowsDiscount"
            defaultChecked={plan?.allowsDiscount ?? true}
            label="Admite descuentos"
          />
        </div>

        <Field label="Beneficios" htmlFor="benefits" hint="Uno por línea. Se muestran en la web.">
          <Textarea id="benefits" name="benefits" rows={4} defaultValue={plan?.benefits.join('\n') ?? ''} />
        </Field>
      </FormSection>

      <div className="sticky bottom-20 z-10 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Submit label={plan ? 'Guardar cambios' : 'Crear plan'} />
      </div>
    </form>
  )
}

function ServiceRow({
  service,
  current,
}: {
  service: ServiceOption
  current?: { quantity: number | null; period: string }
}) {
  const [included, setIncluded] = useState(Boolean(current))
  const [unlimited, setUnlimited] = useState(current ? current.quantity === null : true)

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors duration-150',
        included ? 'border-brand-200 bg-brand-50' : 'border-line',
      )}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name={`included-${service.id}`}
          defaultChecked={Boolean(current)}
          onChange={(event) => setIncluded(event.target.checked)}
          className="mt-0.5 size-4 accent-brand-500"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">{service.name}</span>
          {service.description && (
            <span className="block text-xs text-ink-soft">{service.description}</span>
          )}
        </span>
        {service.requiresTrainer && (
          <span className="shrink-0 rounded-full bg-mute-surface px-2 py-0.5 text-2xs text-mute">
            con entrenador
          </span>
        )}
      </label>

      {included && (
        <div className="animate-fade mt-3 flex flex-wrap items-end gap-3 border-t border-brand-200 pt-3">
          <label className="flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={unlimited}
              onChange={(event) => setUnlimited(event.target.checked)}
              className="size-3.5 accent-brand-500"
            />
            Ilimitado
          </label>

          {!unlimited && (
            <>
              <label className="text-xs text-ink-soft">
                <span className="mb-1 block">Cantidad</span>
                <input
                  type="number"
                  name={`quantity-${service.id}`}
                  min={1}
                  defaultValue={current?.quantity ?? 1}
                  className="h-9 w-20 rounded-md border border-line-strong bg-surface px-2 text-sm text-ink"
                />
              </label>
              <label className="text-xs text-ink-soft">
                <span className="mb-1 block">Periodo</span>
                <select
                  name={`period-${service.id}`}
                  defaultValue={current?.period ?? 'WEEK'}
                  className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-ink"
                >
                  {ENTITLEMENT_PERIODS.map((period) => (
                    <option key={period} value={period}>
                      {PERIOD_LABELS[period]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
  icon,
}: {
  name: string
  label: string
  hint?: string
  defaultChecked?: boolean
  icon?: React.ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 transition-colors duration-150 hover:bg-sunken has-[:checked]:border-brand-200 has-[:checked]:bg-brand-50">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-brand-500" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
          {label}
          {icon}
        </span>
        {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
      </span>
    </label>
  )
}
