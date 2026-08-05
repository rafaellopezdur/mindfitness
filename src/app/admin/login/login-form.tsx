'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertCircle } from 'lucide-react'
import { loginAction, type FormState } from '@/server/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

const INITIAL: FormState = { ok: false }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? 'Entrando…' : 'Entrar'}
    </Button>
  )
}

export function LoginForm({ volver }: { volver?: string }) {
  const [state, formAction] = useActionState(loginAction, INITIAL)

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {volver && <input type="hidden" name="volver" value={volver} />}

      {state.message && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-risk-surface px-3 py-2.5 text-sm text-risk"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{state.message}</span>
        </div>
      )}

      <Field label="Correo" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          placeholder="tucorreo@mindfitnessclub.com.co"
          invalid={Boolean(state.fieldErrors?.email)}
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <SubmitButton />
    </form>
  )
}
