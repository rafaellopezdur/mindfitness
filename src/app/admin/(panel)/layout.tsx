import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { getSessionUser, requireActor } from '@/server/auth/context'
import { logoutAction } from '@/server/modules/auth/actions'
import { MobileNav, Sidebar } from '@/components/admin/nav'
import { visibleNav } from '@/components/admin/nav-items'
import { ROLE_SEED } from '@/shared/constants/permissions'
import { BUSINESS } from '@/config/placeholders'
import { Button } from '@/components/ui/button'
import { initials } from '@/lib/cn'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor()

  // Con contraseña temporal no se entra al panel: se cambia primero.
  const sessionUser = await getSessionUser()
  if (sessionUser?.mustChangePassword) redirect('/admin/cambiar-clave')

  const items = visibleNav(actor.permissions)
  const roleName = actor.roles[0] ? ROLE_SEED[actor.roles[0]].name : 'Sin rol'

  return (
    <div className="min-h-dvh bg-[--color-surface]">
      {/* Escritorio: barra lateral fija */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[--color-border] bg-[--color-surface-raised] lg:flex">
        <div className="border-b border-[--color-border] px-4 py-4">
          <p className="text-sm font-bold uppercase leading-tight tracking-tight text-brand-700">
            {BUSINESS.name}
          </p>
          <p className="text-xs text-[--color-text-muted]">Portal administrativo</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Sidebar items={items} />
        </div>

        <div className="border-t border-[--color-border] p-3">
          <div className="flex items-center gap-3 px-1 py-2">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800"
            >
              {initials(actor.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[--color-text]">{actor.fullName}</p>
              <p className="truncate text-xs text-[--color-text-muted]">{roleName}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="block" className="justify-start">
              <LogOut className="size-4" aria-hidden />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      {/* Móvil: barra superior */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[--color-border] bg-[--color-surface-raised] px-4 py-3 lg:hidden">
        <Link href="/admin" className="text-sm font-bold uppercase tracking-tight text-brand-700">
          {BUSINESS.name}
        </Link>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm" aria-label="Cerrar sesión">
            <LogOut className="size-4" aria-hidden />
          </Button>
        </form>
      </header>

      {/* pb-20 deja sitio a la barra inferior del móvil */}
      <main className="px-4 pb-24 pt-5 sm:px-6 lg:ml-60 lg:pb-10 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <MobileNav items={items} />
    </div>
  )
}
