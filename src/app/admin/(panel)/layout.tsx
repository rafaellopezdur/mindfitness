import { redirect } from 'next/navigation'
import { getSessionUser, requireActor } from '@/server/auth/context'
import { can } from '@/server/auth/rbac'
import { AdminShell } from '@/components/admin/admin-shell'
import { mobileNav, visibleGroups } from '@/components/admin/nav-items'
import { ToastProvider } from '@/components/ui/toast'
import { PERMISSIONS, ROLE_SEED } from '@/shared/constants/permissions'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor()

  // Con contraseña temporal no se entra al panel: se cambia primero.
  const sessionUser = await getSessionUser()
  if (sessionUser?.mustChangePassword) redirect('/admin/cambiar-clave')

  // La acción rápida del móvil depende del rol: lo que esa persona hace más
  // veces al día. Recepción registra clientes; el entrenador consulta accesos.
  const quickAction = can(actor, PERMISSIONS.CLIENT_CREATE)
    ? { href: '/admin/clientes/nuevo', label: 'Registrar cliente' }
    : undefined

  return (
    <ToastProvider>
      <AdminShell
        groups={visibleGroups(actor.permissions)}
        mobileItems={mobileNav(actor.permissions)}
        fullName={actor.fullName}
        roleName={actor.roles[0] ? ROLE_SEED[actor.roles[0]].name : 'Sin rol'}
        quickAction={quickAction}
      >
        {children}
      </AdminShell>
    </ToastProvider>
  )
}
