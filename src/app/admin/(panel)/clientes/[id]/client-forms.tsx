'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Pencil, X } from 'lucide-react'
import {
  addNoteAction,
  overrideStatusAction,
  updateClientAction,
  type ClientFormState,
} from '@/server/modules/clients/actions'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

const INITIAL: ClientFormState = { ok: false }

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Guardando…' : label}
    </Button>
  )
}

export interface EditableClient {
  id: string
  firstName: string
  lastName: string
  phone: string
  whatsapp: string | null
  email: string | null
  address: string | null
  city: string | null
  birthDate: string | null
  acquisitionChannel: string | null
}

export function EditClientForm({ client, channels }: { client: EditableClient; channels: string[] }) {
  const [state, formAction] = useActionState(updateClientAction, INITIAL)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" aria-hidden />
        Editar datos
      </Button>
    )
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="clientId" value={client.id} />

      {state.message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${state.ok ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}
        >
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="firstName" error={state.fieldErrors?.firstName}>
          <Input id="firstName" name="firstName" defaultValue={client.firstName} required />
        </Field>
        <Field label="Apellido" htmlFor="lastName" error={state.fieldErrors?.lastName}>
          <Input id="lastName" name="lastName" defaultValue={client.lastName} required />
        </Field>
        <Field label="Teléfono" htmlFor="phone" error={state.fieldErrors?.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={client.phone} required />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp" error={state.fieldErrors?.whatsapp}>
          <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={client.whatsapp ?? ''} />
        </Field>
        <Field label="Correo" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" defaultValue={client.email ?? ''} />
        </Field>
        <Field label="Fecha de nacimiento" htmlFor="birthDate" error={state.fieldErrors?.birthDate}>
          <Input id="birthDate" name="birthDate" type="date" defaultValue={client.birthDate ?? ''} />
        </Field>
        <Field label="Dirección" htmlFor="address" error={state.fieldErrors?.address}>
          <Input id="address" name="address" defaultValue={client.address ?? ''} />
        </Field>
        <Field label="Ciudad" htmlFor="city" error={state.fieldErrors?.city}>
          <Input id="city" name="city" defaultValue={client.city ?? ''} />
        </Field>
      </div>

      <Field label="¿Cómo nos conoció?" htmlFor="acquisitionChannel">
        <select
          id="acquisitionChannel"
          name="acquisitionChannel"
          defaultValue={client.acquisitionChannel ?? ''}
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

      <div className="flex gap-2">
        <Submit label="Guardar cambios" />
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </div>

      <p className="text-xs text-[--color-text-muted]">
        El tipo y número de documento no se editan aquí: corregirlos requiere permiso de administradora
        y queda registrado con el motivo.
      </p>
    </form>
  )
}

export function AddNoteForm({ clientId, canSeeTrainerNotes }: { clientId: string; canSeeTrainerNotes: boolean }) {
  const [state, formAction] = useActionState(addNoteAction, INITIAL)

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="clientId" value={clientId} />

      {state.message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${state.ok ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}
        >
          {state.message}
        </p>
      )}

      <Field label="Nueva observación" htmlFor="body" error={state.fieldErrors?.body}>
        <textarea
          id="body"
          name="body"
          rows={3}
          placeholder="Lesión previa, preferencia de horario, acuerdo puntual…"
          className="block w-full rounded-lg border border-[--color-border-strong] bg-[--color-surface-raised] px-3 py-2 text-sm text-[--color-text] placeholder:text-[--color-text-subtle]"
        />
      </Field>

      {canSeeTrainerNotes && (
        <label className="flex items-center gap-2 text-sm text-[--color-text-muted]">
          <input
            type="checkbox"
            name="visibility"
            value="TRAINER"
            className="size-4 accent-brand-500"
          />
          Visible para el entrenador asignado
        </label>
      )}

      <Button type="submit" variant="secondary" size="sm">
        Guardar observación
      </Button>
      <p className="text-xs text-[--color-text-muted]">
        Las observaciones no se editan ni se borran: para corregir, se añade otra.
      </p>
    </form>
  )
}

export function OverrideStatusForm({
  clientId,
  current,
}: {
  clientId: string
  current: 'BLOCKED' | 'INACTIVE' | null
}) {
  const [state, formAction] = useActionState(overrideStatusAction, INITIAL)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {current ? 'Cambiar estado forzado' : 'Forzar estado'}
      </Button>
    )
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-[--color-border-strong] p-4" noValidate>
      <input type="hidden" name="clientId" value={clientId} />

      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[--color-text]">Forzar el estado del cliente</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Cerrar">
          <X className="size-4" aria-hidden />
        </Button>
      </div>

      <p className="text-xs text-[--color-text-muted]">
        Normalmente el estado se calcula solo a partir de la membresía. Forzarlo lo congela hasta que se
        quite, y queda en la bitácora con tu nombre y el motivo.
      </p>

      {state.message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${state.ok ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}
        >
          {state.message}
        </p>
      )}

      <Field label="Estado" htmlFor="status" error={state.fieldErrors?.status}>
        <select
          id="status"
          name="status"
          defaultValue={current ?? 'NONE'}
          className="min-h-11 w-full rounded-lg border border-[--color-border-strong] bg-[--color-surface-raised] px-3 text-sm text-[--color-text]"
        >
          <option value="NONE">Automático (según su membresía)</option>
          <option value="BLOCKED">Bloqueado</option>
          <option value="INACTIVE">Inactivo</option>
        </select>
      </Field>

      <Field label="Motivo" htmlFor="reason" error={state.fieldErrors?.reason}>
        <Input id="reason" name="reason" required invalid={Boolean(state.fieldErrors?.reason)} />
      </Field>

      <Submit label="Aplicar" />
    </form>
  )
}
