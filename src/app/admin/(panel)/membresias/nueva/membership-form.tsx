'use client'

import { useActionState, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Info } from 'lucide-react'
import {
  createMembershipAction,
  type MembershipFormState,
} from '@/server/modules/memberships/actions'
import { Button } from '@/components/ui/button'
import { Field, FormSection, Input, Textarea } from '@/components/ui/field'
import { Select, type SelectOption } from '@/components/ui/select'
import { formatMoney } from '@/lib/cn'

const INITIAL: MembershipFormState = { ok: false }

export interface ClientOption {
  id: string
  name: string
  document: string
  initials: string
  hasActiveMembership: boolean
}

export interface PlanOption {
  id: string
  name: string
  price: number
  summary: string
  services: string[]
}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Creando…' : 'Crear membresía'}
    </Button>
  )
}

export function MembershipForm({
  clients,
  plans,
  today,
  preselectedClientId,
}: {
  clients: ClientOption[]
  plans: PlanOption[]
  today: string
  preselectedClientId?: string
}) {
  const [state, formAction] = useActionState(createMembershipAction, INITIAL)
  const [planId, setPlanId] = useState(plans[0]?.id ?? '')
  const [discount, setDiscount] = useState('')

  const plan = plans.find((option) => option.id === planId)
  const discountValue = Number(discount.replace(/\D/g, '')) || 0
  const finalPrice = Math.max(0, (plan?.price ?? 0) - discountValue)

  // El selector de cliente muestra documento y avisa si ya tiene membresía:
  // así el error se ve antes de enviar, no después.
  const clientOptions: SelectOption[] = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: client.name,
        description: client.document,
        avatar: client.initials,
        disabled: client.hasActiveMembership,
        badge: client.hasActiveMembership ? (
          <span className="shrink-0 rounded-full bg-warn-surface px-2 py-0.5 text-2xs text-warn">
            ya tiene una
          </span>
        ) : undefined,
      })),
    [clients],
  )

  const planOptions: SelectOption[] = useMemo(
    () =>
      plans.map((option) => ({
        value: option.id,
        label: option.name,
        description: option.summary,
        badge: <span className="tabular shrink-0 text-xs text-ink-soft">{formatMoney(option.price)}</span>,
      })),
    [plans],
  )

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message && (
        <p role="alert" className="animate-fade rounded-lg bg-risk-surface px-3.5 py-2.5 text-sm text-risk">
          {state.message}
        </p>
      )}

      <FormSection title="Quién y qué plan">
        <Field label="Cliente" htmlFor="clientId" error={state.fieldErrors?.clientId} required>
          <Select
            id="clientId"
            name="clientId"
            defaultValue={preselectedClientId}
            options={clientOptions}
            placeholder="Busca por nombre o documento"
            searchable
            searchPlaceholder="Nombre o documento…"
            emptyMessage="Ningún cliente coincide"
          />
        </Field>

        <Field label="Plan" htmlFor="planId" error={state.fieldErrors?.planId} required>
          <Select
            id="planId"
            name="planId"
            value={planId}
            onValueChange={setPlanId}
            options={planOptions}
            placeholder="Elige un plan"
          />
        </Field>

        {plan && plan.services.length > 0 && (
          <div className="animate-fade rounded-lg border border-line bg-sunken p-3">
            <p className="eyebrow mb-2">Lo que quedará contratado</p>
            <ul className="space-y-1">
              {plan.services.map((service) => (
                <li key={service} className="flex items-center gap-2 text-xs text-ink">
                  <span aria-hidden className="text-ok">
                    ✓
                  </span>
                  {service}
                </li>
              ))}
            </ul>
          </div>
        )}
      </FormSection>

      <FormSection title="Condiciones" description="Quedarán congeladas en esta membresía.">
        <Field label="Fecha de inicio" htmlFor="startDate" error={state.fieldErrors?.startDate} required>
          <Input id="startDate" name="startDate" type="date" defaultValue={today} required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Descuento"
            htmlFor="discountAmount"
            error={state.fieldErrors?.discountAmount}
            hint="En pesos. Déjalo vacío si no hay."
          >
            <Input
              id="discountAmount"
              name="discountAmount"
              inputMode="numeric"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </Field>
          <Field
            label="Motivo del descuento"
            htmlFor="discountReason"
            error={state.fieldErrors?.discountReason}
            hint="Obligatorio si hay descuento."
          >
            <Input id="discountReason" name="discountReason" />
          </Field>
        </div>

        {plan && (
          <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
            <span className="text-sm text-ink-soft">Precio final</span>
            <span className="text-right">
              {discountValue > 0 && (
                <span className="tabular mr-2 text-xs text-ink-faint line-through">
                  {formatMoney(plan.price)}
                </span>
              )}
              <span className="numeral text-lg text-ink">{formatMoney(finalPrice)}</span>
            </span>
          </div>
        )}

        <Field label="Notas" htmlFor="notes">
          <Textarea id="notes" name="notes" rows={2} />
        </Field>
      </FormSection>

      <p className="flex items-start gap-2 rounded-lg bg-info-surface px-3.5 py-2.5 text-xs text-info">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          La membresía se crea <strong>pendiente</strong>. Se activa al confirmar el pago; mientras el
          módulo de pagos no exista (Fase 4), la activación es manual y queda auditada.
        </span>
      </p>

      <div className="sticky bottom-20 z-10 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Submit />
      </div>
    </form>
  )
}
