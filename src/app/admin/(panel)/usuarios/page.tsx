import type { Metadata } from 'next'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { requirePermission } from '@/server/auth/context'
import { prisma } from '@/server/infra/prisma'
import { PERMISSIONS, ROLE_SEED, type RoleCode } from '@/shared/constants/permissions'
import { can } from '@/server/auth/rbac'
import { PageHeader } from '@/components/patterns/page-header'
import { Button } from '@/components/ui/button'
import { formatDateTime, initials } from '@/lib/cn'
import { resetPasswordAction, toggleUserActiveAction } from '@/server/modules/users/actions'
import { CreateUserForm } from './create-user-form'

export const metadata: Metadata = { title: 'Usuarios' }

export default async function UsersPage() {
  const actor = await requirePermission(PERMISSIONS.USER_READ, '/admin/usuarios')

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { roles: { include: { role: true } } },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
  })

  const canCreate = can(actor, PERMISSIONS.USER_CREATE)
  const canDeactivate = can(actor, PERMISSIONS.USER_DEACTIVATE)
  const canReset = can(actor, PERMISSIONS.USER_UPDATE)

  return (
    <>
      <PageHeader
        title="Usuarios y permisos"
        description="Personal con acceso al portal administrativo."
      />

      {canCreate && (
        <div className="mb-6">
          <CreateUserForm />
        </div>
      )}

      {/* DataView en miniatura: tabla en escritorio, tarjetas en móvil.
          Los mismos datos, una sola fuente (docs/08-identidad-visual.md §5). */}
      <ul className="space-y-3 lg:hidden">
        {users.map((user) => (
          <li
            key={user.id}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800"
              >
                {initials(user.fullName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{user.fullName}</p>
                <p className="truncate text-xs text-ink-soft">{user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {user.roles.map((r) => (
                    <RoleChip key={r.roleId} code={r.role.code as RoleCode} />
                  ))}
                  <StateChip active={user.isActive} pending={user.mustChangePassword} />
                </div>
              </div>
            </div>
            <UserActions
              userId={user.id}
              isSelf={user.id === actor.userId}
              isActive={user.isActive}
              canDeactivate={canDeactivate}
              canReset={canReset}
            />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface lg:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-sunken">
            <tr className="text-left text-xs uppercase tracking-wide text-ink-soft">
              <th scope="col" className="px-4 py-3 font-medium">Usuario</th>
              <th scope="col" className="px-4 py-3 font-medium">Rol</th>
              <th scope="col" className="px-4 py-3 font-medium">Estado</th>
              <th scope="col" className="px-4 py-3 font-medium">Último ingreso</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800"
                    >
                      {initials(user.fullName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{user.fullName}</p>
                      <p className="truncate text-xs text-ink-soft">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.roles.map((r) => (
                    <RoleChip key={r.roleId} code={r.role.code as RoleCode} />
                  ))}
                </td>
                <td className="px-4 py-3">
                  <StateChip active={user.isActive} pending={user.mustChangePassword} />
                </td>
                <td className="px-4 py-3 text-xs text-ink-soft">
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <UserActions
                    userId={user.id}
                    isSelf={user.id === actor.userId}
                    isActive={user.isActive}
                    canDeactivate={canDeactivate}
                    canReset={canReset}
                    align="right"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 flex items-start gap-2 text-xs text-ink-soft">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Nadie puede modificar sus propios permisos ni desactivar su cuenta, y siempre debe quedar al
          menos una propietaria activa. Todo cambio queda en la bitácora de auditoría.
        </span>
      </p>
    </>
  )
}

function RoleChip({ code }: { code: RoleCode }) {
  return (
    <span className="mr-1.5 inline-block rounded-full bg-sunken px-2 py-0.5 text-xs text-ink-soft">
      {ROLE_SEED[code]?.name ?? code}
    </span>
  )
}

function StateChip({ active, pending }: { active: boolean; pending: boolean }) {
  if (!active) {
    return (
      <span className="inline-block rounded-full bg-mute-surface px-2 py-0.5 text-xs font-medium text-mute">
        Inactivo
      </span>
    )
  }
  if (pending) {
    return (
      <span className="inline-block rounded-full bg-warn-surface px-2 py-0.5 text-xs font-medium text-warn">
        Clave temporal
      </span>
    )
  }
  return (
    <span className="inline-block rounded-full bg-ok-surface px-2 py-0.5 text-xs font-medium text-ok">
      Activo
    </span>
  )
}

function UserActions({
  userId,
  isSelf,
  isActive,
  canDeactivate,
  canReset,
  align,
}: {
  userId: string
  isSelf: boolean
  isActive: boolean
  canDeactivate: boolean
  canReset: boolean
  align?: 'right'
}) {
  if (isSelf) {
    return (
      <p className={`mt-3 text-xs text-ink-faint lg:mt-0 ${align === 'right' ? 'text-right' : ''}`}>
        Tu cuenta
      </p>
    )
  }

  return (
    <div className={`mt-3 flex gap-2 lg:mt-0 ${align === 'right' ? 'justify-end' : ''}`}>
      {canReset && (
        <form action={resetPasswordAction}>
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" variant="ghost" size="sm">
            <KeyRound className="size-3.5" aria-hidden />
            Restablecer clave
          </Button>
        </form>
      )}
      {canDeactivate && (
        <form action={toggleUserActiveAction}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="reason" value={isActive ? 'Desactivado desde el panel' : 'Reactivado desde el panel'} />
          <Button type="submit" variant={isActive ? 'ghost' : 'secondary'} size="sm">
            {isActive ? 'Desactivar' : 'Reactivar'}
          </Button>
        </form>
      )}
    </div>
  )
}
