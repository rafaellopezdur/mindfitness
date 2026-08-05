import { redirect } from 'next/navigation'
import { getSessionUser, requireActor } from '@/server/auth/context'
import { AdminShell } from '@/components/admin/admin-shell'
import { visibleNav } from '@/components/admin/nav-items'
import { ROLE_SEED } from '@/shared/constants/permissions'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor()

  // Con contraseña temporal no se entra al panel: se cambia primero.
  const sessionUser = await getSessionUser()
  if (sessionUser?.mustChangePassword) redirect('/admin/cambiar-clave')

  return (
    <AdminShell
      items={visibleNav(actor.permissions)}
      fullName={actor.fullName}
      roleName={actor.roles[0] ? ROLE_SEED[actor.roles[0]].name : 'Sin rol'}
    >
      {children}
    </AdminShell>
  )
}
