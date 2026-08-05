import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/server/auth/context'
import { BUSINESS } from '@/config/placeholders'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Entrar' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string }>
}) {
  const user = await getSessionUser()
  if (user) redirect(user.mustChangePassword ? '/admin/cambiar-clave' : '/admin')

  const { volver } = await searchParams

  return (
    <main className="grid min-h-dvh grid-cols-1 place-items-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-tight text-brand-300 sm:text-3xl">
            {BUSINESS.name}
          </h1>
          <p className="mt-2 text-sm text-stone-400">Portal administrativo</p>
        </div>

        <div className="rounded-2xl bg-[--color-surface-raised] p-6 shadow-lg">
          <LoginForm volver={volver} />
        </div>

        <p className="mt-6 text-center text-xs text-stone-500">
          ¿Olvidaste tu contraseña? Pídele a una administradora que la restablezca.
        </p>
      </div>
    </main>
  )
}
