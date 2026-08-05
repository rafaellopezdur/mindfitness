import 'server-only'
import { cache } from 'react'
import type { Route } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { readSession } from '@/server/auth/session'
import { ForbiddenError, type ActorContext, can } from '@/server/auth/rbac'
import type { Permission, RoleCode } from '@/shared/constants/permissions'

/**
 * Construye el ActorContext de la petición actual.
 *
 * `cache()` de React lo memoriza por petición: el layout, la página y cada
 * Server Action comparten la misma lectura en lugar de golpear la base de
 * datos una vez por componente.
 */
export const getActor = cache(async (): Promise<ActorContext | null> => {
  const session = await readSession()
  if (!session) return null

  const permissions = new Set<Permission>()
  const roles: RoleCode[] = []

  for (const userRole of session.user.roles) {
    roles.push(userRole.role.code as RoleCode)
    for (const rolePermission of userRole.role.permissions) {
      permissions.add(rolePermission.permission.code as Permission)
    }
  }

  const headerList = await headers()

  return {
    userId: session.user.id,
    email: session.user.email,
    fullName: session.user.fullName,
    roles,
    permissions,
    sessionId: session.id,
    ip: headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    userAgent: headerList.get('user-agent') ?? undefined,
  }
})

/** Como getActor pero además indica si debe cambiar la contraseña. */
export const getSessionUser = cache(async () => {
  const session = await readSession()
  if (!session) return null
  return {
    id: session.user.id,
    email: session.user.email,
    fullName: session.user.fullName,
    mustChangePassword: session.user.mustChangePassword,
  }
})

/** Exige sesión. Si no hay, manda al login conservando el destino. */
export async function requireActor(returnTo?: string): Promise<ActorContext> {
  const actor = await getActor()
  if (!actor) {
    // La ruta se compone en tiempo de ejecución, así que typedRoutes no puede
    // verificarla estáticamente; el destino base sí es una ruta real.
    const target = returnTo ? `/admin/login?volver=${encodeURIComponent(returnTo)}` : '/admin/login'
    redirect(target as Route)
  }
  return actor
}

/**
 * Exige sesión y permiso. Es la puerta de entrada de cada página del panel.
 * La comprobación ocurre SIEMPRE en el servidor: ocultar el enlace del menú
 * es cosmética, no autorización (RN-90).
 */
export async function requirePermission(permission: Permission, returnTo?: string): Promise<ActorContext> {
  const actor = await requireActor(returnTo)
  if (!can(actor, permission)) throw new ForbiddenError(permission)
  return actor
}
