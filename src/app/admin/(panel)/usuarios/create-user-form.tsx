'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Copy, UserPlus, X } from 'lucide-react'
import { createUserAction, type UserFormState } from '@/server/modules/users/actions'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { cn } from '@/lib/cn'

const INITIAL: UserFormState = { ok: false }

const ROLES = [
  { code: 'FRONT_DESK', name: 'Recepción', hint: 'Clientes, pagos presenciales, asistencia y cartera.' },
  { code: 'TRAINER', name: 'Entrenador', hint: 'Solo sus clientes y franjas. Sin información financiera.' },
  { code: 'OWNER', name: 'Propietaria', hint: 'Acceso completo, incluida la configuración crítica.' },
]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creando…' : 'Crear usuario'}
    </Button>
  )
}

export function CreateUserForm() {
  const [state, formAction] = useActionState(createUserAction, INITIAL)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Contraseña temporal: se muestra una sola vez, en cuanto se crea.
  if (state.ok && state.temporaryPassword) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success-bg p-5">
        <p className="text-sm font-semibold text-[--color-text]">Usuario creado</p>
        <p className="mt-1 text-sm text-[--color-text-muted]">{state.message}</p>

        <div className="mt-4 rounded-lg border border-[--color-border-strong] bg-[--color-surface-raised] p-3">
          <p className="text-xs text-[--color-text-muted]">Contraseña temporal</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <code className="tabular text-lg font-semibold tracking-wide text-[--color-text]">
              {state.temporaryPassword}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(state.temporaryPassword ?? '')
                setCopied(true)
              }}
            >
              <Copy className="size-3.5" aria-hidden />
              {copied ? 'Copiada' : 'Copiar'}
            </Button>
          </div>
        </div>

        <p className="mt-3 text-xs text-[--color-text-muted]">
          Entrégasela en persona. <strong>No se vuelve a mostrar</strong> y se le pedirá cambiarla al entrar.
        </p>

        <Button variant="secondary" size="sm" className="mt-4" onClick={() => window.location.reload()}>
          Listo
        </Button>
      </div>
    )
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden />
        Nuevo usuario
      </Button>
    )
  }

  return (
    <div className="rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[--color-text]">Nuevo usuario</h2>
          <p className="text-xs text-[--color-text-muted]">
            Se genera una contraseña temporal que deberá cambiar al entrar.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Cerrar">
          <X className="size-4" aria-hidden />
        </Button>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        {state.message && !state.ok && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
            {state.message}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" htmlFor="fullName" error={state.fieldErrors?.fullName}>
            <Input id="fullName" name="fullName" required invalid={Boolean(state.fieldErrors?.fullName)} />
          </Field>
          <Field label="Correo" htmlFor="email" error={state.fieldErrors?.email}>
            <Input id="email" name="email" type="email" required invalid={Boolean(state.fieldErrors?.email)} />
          </Field>
        </div>

        <Field label="Teléfono (opcional)" htmlFor="phone" error={state.fieldErrors?.phone}>
          <Input id="phone" name="phone" type="tel" />
        </Field>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-[--color-text]">Rol</legend>
          <div className="space-y-2">
            {ROLES.map((role, index) => (
              <label
                key={role.code}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border border-[--color-border-strong] p-3',
                  'hover:bg-[--color-surface-sunken] has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50',
                )}
              >
                <input
                  type="radio"
                  name="roleCode"
                  value={role.code}
                  defaultChecked={index === 0}
                  className="mt-0.5 size-4 accent-[--color-brand-500]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[--color-text]">{role.name}</span>
                  <span className="block text-xs text-[--color-text-muted]">{role.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {state.fieldErrors?.roleCode && (
            <p role="alert" className="mt-1 text-xs font-medium text-danger">
              {state.fieldErrors.roleCode}
            </p>
          )}
        </fieldset>

        <div className="flex gap-2">
          <SubmitButton />
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
