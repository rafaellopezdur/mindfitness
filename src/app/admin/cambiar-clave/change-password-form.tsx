'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { changePasswordAction, type FormState } from '@/server/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { PASSWORD_MIN_LENGTH } from '@/shared/schemas/auth'

const INITIAL: FormState = { ok: false }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar contraseña'}
    </Button>
  )
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, INITIAL)

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field label="Contraseña actual" htmlFor="currentPassword" error={state.fieldErrors?.currentPassword}>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          invalid={Boolean(state.fieldErrors?.currentPassword)}
        />
      </Field>

      <Field
        label="Contraseña nueva"
        htmlFor="newPassword"
        error={state.fieldErrors?.newPassword}
        hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con mayúscula, minúscula y número.`}
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          invalid={Boolean(state.fieldErrors?.newPassword)}
        />
      </Field>

      <Field label="Repite la contraseña nueva" htmlFor="confirmPassword" error={state.fieldErrors?.confirmPassword}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          invalid={Boolean(state.fieldErrors?.confirmPassword)}
        />
      </Field>

      <SubmitButton />
    </form>
  )
}
