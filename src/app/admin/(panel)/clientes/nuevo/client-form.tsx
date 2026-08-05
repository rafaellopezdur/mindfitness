'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertTriangle, Zap } from 'lucide-react'
import { createClientAction, type ClientFormState } from '@/server/modules/clients/actions'
import { DOCUMENT_TYPES } from '@/server/domain/clients'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { cn } from '@/lib/cn'

const INITIAL: ClientFormState = { ok: false }

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Guardando…' : label}
    </Button>
  )
}

/**
 * RN-86 · Dos modos con el MISMO formulario.
 *
 * "Rápido" pide 5 campos: en recepción hay una persona esperando de pie y cada
 * campo obligatorio de más es tiempo perdido. Lo demás se completa después
 * desde la ficha.
 */
export function ClientForm({ channels }: { channels: string[] }) {
  const [state, formAction] = useActionState(createClientAction, INITIAL)
  const [mode, setMode] = useState<'quick' | 'full'>('quick')

  const warnings = state.duplicates?.filter((d) => d.level === 'WARN') ?? []
  const showAcknowledge = warnings.length > 0 && !state.duplicates?.some((d) => d.level === 'BLOCK')

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="mode" value={mode} />

      <div
        role="group"
        aria-label="Tipo de registro"
        className="inline-flex rounded-lg border border-[--color-border-strong] p-0.5"
      >
        {(['quick', 'full'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={cn(
              'flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm transition-colors',
              mode === value
                ? 'bg-brand-500 font-medium text-white'
                : 'text-[--color-text-muted] hover:text-[--color-text]',
            )}
          >
            {value === 'quick' && <Zap className="size-3.5" aria-hidden />}
            {value === 'quick' ? 'Registro rápido' : 'Ficha completa'}
          </button>
        ))}
      </div>

      {state.message && (
        <div role="alert" className="rounded-lg bg-danger-bg px-3 py-2.5 text-sm text-danger">
          {state.message}
        </div>
      )}

      {state.duplicates && state.duplicates.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning-bg p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-warning">
            <AlertTriangle className="size-4" aria-hidden />
            Clientes parecidos
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[--color-text]">
            {state.duplicates.map((duplicate) => (
              <li key={duplicate.clientId}>
                <span className="font-medium">{duplicate.name}</span>{' '}
                <span className="text-[--color-text-muted]">
                  · {duplicate.documentMasked} · {duplicate.reason}
                </span>
              </li>
            ))}
          </ul>
          {showAcknowledge && (
            <label className="mt-3 flex items-start gap-2 text-sm text-[--color-text]">
              <input
                type="checkbox"
                name="acknowledgeDuplicates"
                value="1"
                className="mt-0.5 size-4 accent-[--color-brand-500]"
              />
              <span>Ya lo revisé: es una persona distinta, crear de todos modos.</span>
            </label>
          )}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-5">
        <h2 className="text-sm font-semibold text-[--color-text]">Datos básicos</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="firstName" error={state.fieldErrors?.firstName}>
            <Input id="firstName" name="firstName" autoFocus required invalid={Boolean(state.fieldErrors?.firstName)} />
          </Field>
          <Field label="Apellido" htmlFor="lastName" error={state.fieldErrors?.lastName}>
            <Input id="lastName" name="lastName" required invalid={Boolean(state.fieldErrors?.lastName)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <Field label="Tipo de documento" htmlFor="documentType" error={state.fieldErrors?.documentType}>
            <select
              id="documentType"
              name="documentType"
              defaultValue="CC"
              className="min-h-11 w-full rounded-lg border border-[--color-border-strong] bg-[--color-surface-raised] px-3 text-sm text-[--color-text]"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Número de documento"
            htmlFor="documentNumber"
            error={state.fieldErrors?.documentNumber}
            hint="Puedes escribirlo con puntos: se normaliza solo."
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
        >
          <Input id="phone" name="phone" type="tel" inputMode="tel" required invalid={Boolean(state.fieldErrors?.phone)} />
        </Field>
      </section>

      {mode === 'full' && (
        <>
          <section className="space-y-4 rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-5">
            <h2 className="text-sm font-semibold text-[--color-text]">Contacto</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp" htmlFor="whatsapp" error={state.fieldErrors?.whatsapp}>
                <Input id="whatsapp" name="whatsapp" type="tel" />
              </Field>
              <Field label="Correo" htmlFor="email" error={state.fieldErrors?.email}>
                <Input id="email" name="email" type="email" invalid={Boolean(state.fieldErrors?.email)} />
              </Field>
              <Field label="Dirección" htmlFor="address" error={state.fieldErrors?.address}>
                <Input id="address" name="address" />
              </Field>
              <Field label="Ciudad" htmlFor="city" error={state.fieldErrors?.city}>
                <Input id="city" name="city" />
              </Field>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-5">
            <h2 className="text-sm font-semibold text-[--color-text]">Información adicional</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha de nacimiento" htmlFor="birthDate" error={state.fieldErrors?.birthDate}>
                <Input id="birthDate" name="birthDate" type="date" invalid={Boolean(state.fieldErrors?.birthDate)} />
              </Field>
              <Field label="¿Cómo nos conoció?" htmlFor="acquisitionChannel">
                <select
                  id="acquisitionChannel"
                  name="acquisitionChannel"
                  defaultValue=""
                  className="min-h-11 w-full rounded-lg border border-[--color-border-strong] bg-[--color-surface-raised] px-3 text-sm text-[--color-text]"
                >
                  <option value="">Sin especificar</option>
                  {channels.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-5">
            <h2 className="text-sm font-semibold text-[--color-text]">Contacto de emergencia</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nombre" htmlFor="emergencyName" error={state.fieldErrors?.emergencyName}>
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

            <Field label="Observaciones" htmlFor="notes" error={state.fieldErrors?.notes}>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="block w-full rounded-lg border border-[--color-border-strong] bg-[--color-surface-raised] px-3 py-2 text-sm text-[--color-text]"
              />
            </Field>
          </section>
        </>
      )}

      <div className="flex gap-2">
        <SubmitButton label={mode === 'quick' ? 'Crear cliente' : 'Crear ficha completa'} />
      </div>
    </form>
  )
}
