'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertTriangle, FileText, Zap } from 'lucide-react'
import { createClientAction, type ClientFormState } from '@/server/modules/clients/actions'
import { DOCUMENT_TYPES } from '@/server/domain/clients'
import { Button } from '@/components/ui/button'
import { Field, FormSection, Input, Textarea } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/cn'

const INITIAL: ClientFormState = { ok: false }

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Guardando…' : label}
    </Button>
  )
}

/**
 * RN-86 · Dos modos, un solo formulario.
 *
 * «Rápido» pide cinco campos porque en el mostrador hay alguien esperando de
 * pie: cada campo obligatorio de más es tiempo. «Completa» despliega el resto
 * en secciones, nunca veinte campos seguidos.
 */
export function ClientForm({ channels }: { channels: string[] }) {
  const [state, formAction] = useActionState(createClientAction, INITIAL)
  const [mode, setMode] = useState<'quick' | 'full'>('quick')

  const blocking = state.duplicates?.some((duplicate) => duplicate.level === 'BLOCK')
  const showAcknowledge = (state.duplicates?.length ?? 0) > 0 && !blocking

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="mode" value={mode} />

      {/* Conmutador de modo. El deslizador se mueve con `transform`. */}
      <div
        role="group"
        aria-label="Tipo de registro"
        className="relative inline-flex rounded-lg border border-line bg-sunken p-1"
      >
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-md bg-surface shadow-flat',
            'transition-transform duration-200 ease-out',
            mode === 'full' && 'translate-x-[calc(100%+0.5rem)]',
          )}
        />
        {(
          [
            { value: 'quick', label: 'Registro rápido', icon: Zap },
            { value: 'full', label: 'Ficha completa', icon: FileText },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            aria-pressed={mode === option.value}
            className={cn(
              'relative z-10 flex h-9 flex-1 items-center justify-center gap-1.5 px-3.5 text-sm',
              'transition-colors duration-150',
              mode === option.value ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink',
            )}
          >
            <option.icon className="size-3.5" aria-hidden />
            {option.label}
          </button>
        ))}
      </div>

      {state.message && (
        <p role="alert" className="animate-fade rounded-lg bg-risk-surface px-3.5 py-2.5 text-sm text-risk">
          {state.message}
        </p>
      )}

      {state.duplicates && state.duplicates.length > 0 && (
        <div className="animate-rise rounded-lg border border-warn/25 bg-warn-surface p-3.5">
          <p className="flex items-center gap-2 text-sm font-medium text-warn">
            <AlertTriangle className="size-4" aria-hidden />
            {blocking ? 'Este documento ya está registrado' : 'Encontramos personas parecidas'}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {state.duplicates.map((duplicate) => (
              <li key={duplicate.clientId} className="text-ink">
                <span className="font-medium">{duplicate.name}</span>
                <span className="tabular text-ink-soft"> · {duplicate.documentMasked}</span>
                <span className="text-ink-soft"> · {duplicate.reason}</span>
              </li>
            ))}
          </ul>
          {showAcknowledge && (
            <label className="mt-3 flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="acknowledgeDuplicates"
                value="1"
                className="mt-0.5 size-4 accent-brand-500"
              />
              <span>Ya lo revisé: es otra persona, crear de todos modos.</span>
            </label>
          )}
        </div>
      )}

      <FormSection title="Datos básicos" description="Lo mínimo para poder atender a esta persona.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="firstName" error={state.fieldErrors?.firstName} required>
            <Input id="firstName" name="firstName" autoFocus required invalid={Boolean(state.fieldErrors?.firstName)} />
          </Field>
          <Field label="Apellido" htmlFor="lastName" error={state.fieldErrors?.lastName} required>
            <Input id="lastName" name="lastName" required invalid={Boolean(state.fieldErrors?.lastName)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,15rem)_1fr]">
          <Field label="Tipo de documento" htmlFor="documentType" error={state.fieldErrors?.documentType} required>
            <Select
              id="documentType"
              name="documentType"
              defaultValue="CC"
              options={DOCUMENT_TYPES.map((type) => ({
                value: type.value,
                label: type.label,
                description: type.hint,
              }))}
            />
          </Field>
          <Field
            label="Número de documento"
            htmlFor="documentNumber"
            error={state.fieldErrors?.documentNumber}
            hint="Puedes escribirlo con puntos: se normaliza solo."
            required
          >
            <Input
              id="documentNumber"
              name="documentNumber"
              inputMode="numeric"
              required
              invalid={Boolean(state.fieldErrors?.documentNumber)}
            />
          </Field>
        </div>

        <Field
          label="Teléfono"
          htmlFor="phone"
          error={state.fieldErrors?.phone}
          hint="Se usará también como WhatsApp si no indicas otro."
          required
        >
          <Input id="phone" name="phone" type="tel" inputMode="tel" required invalid={Boolean(state.fieldErrors?.phone)} />
        </Field>
      </FormSection>

      {/* La ficha completa aparece con desplazamiento suave, sin salto. */}
      {mode === 'full' && (
        <div className="animate-rise space-y-5">
          <FormSection title="Contacto">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp" htmlFor="whatsapp" error={state.fieldErrors?.whatsapp}>
                <Input id="whatsapp" name="whatsapp" type="tel" />
              </Field>
              <Field label="Correo" htmlFor="email" error={state.fieldErrors?.email}>
                <Input id="email" name="email" type="email" invalid={Boolean(state.fieldErrors?.email)} />
              </Field>
              <Field label="Dirección" htmlFor="address">
                <Input id="address" name="address" />
              </Field>
              <Field label="Ciudad" htmlFor="city">
                <Input id="city" name="city" />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Información adicional">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha de nacimiento" htmlFor="birthDate" error={state.fieldErrors?.birthDate}>
                <Input id="birthDate" name="birthDate" type="date" invalid={Boolean(state.fieldErrors?.birthDate)} />
              </Field>
              <Field label="¿Cómo nos conoció?" htmlFor="acquisitionChannel">
                <Select
                  id="acquisitionChannel"
                  name="acquisitionChannel"
                  placeholder="Sin especificar"
                  clearable
                  options={channels.map((channel) => ({ value: channel, label: channel }))}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Contacto de emergencia"
            description="Conviene pedirlo antes de la primera sesión."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nombre" htmlFor="emergencyName">
                <Input id="emergencyName" name="emergencyName" />
              </Field>
              <Field label="Parentesco" htmlFor="emergencyRelationship">
                <Input id="emergencyRelationship" name="emergencyRelationship" />
              </Field>
              <Field label="Teléfono" htmlFor="emergencyPhone" error={state.fieldErrors?.emergencyPhone}>
                <Input
                  id="emergencyPhone"
                  name="emergencyPhone"
                  type="tel"
                  invalid={Boolean(state.fieldErrors?.emergencyPhone)}
                />
              </Field>
            </div>

            <Field label="Observaciones" htmlFor="notes">
              <Textarea id="notes" name="notes" rows={3} placeholder="Lesión previa, preferencia de horario…" />
            </Field>
          </FormSection>
        </div>
      )}

      {/* En móvil la acción queda fija al alcance del pulgar. */}
      <div className="sticky bottom-20 z-10 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <SubmitButton label={mode === 'quick' ? 'Crear cliente' : 'Crear ficha completa'} />
      </div>
    </form>
  )
}
