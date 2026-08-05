import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { getSessionUser } from '@/server/auth/context'
import { ChangePasswordForm } from './change-password-form'

export const metadata: Metadata = { title: 'Cambiar contraseña' }

export default async function ChangePasswordPage() {
  const user = await getSessionUser()
  if (!user) redirect('/admin/login')

  return (
    <main className="grid min-h-dvh grid-cols-1 place-items-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand-300/15 text-brand-300">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <h1 className="mt-3 text-xl font-semibold text-stone-100">Cambia tu contraseña</h1>
          <p className="mt-1 text-sm text-stone-400">
            {user.mustChangePassword
              ? 'Tu contraseña es temporal. Elige una propia para continuar.'
              : 'Actualiza tu contraseña de acceso.'}
          </p>
        </div>

        <div className="rounded-2xl bg-[--color-surface-raised] p-6 shadow-lg">
          <ChangePasswordForm />
        </div>

        <p className="mt-6 text-center text-xs text-stone-500">
          Al cambiarla se cerrarán las demás sesiones abiertas con tu cuenta.
        </p>
      </div>
    </main>
  )
}
