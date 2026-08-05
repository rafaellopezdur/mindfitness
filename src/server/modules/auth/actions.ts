'use server'

import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { prisma } from '@/server/infra/prisma'
import { hashPassword, verifyPassword } from '@/server/auth/password'
import { createSession, destroyCurrentSession, revokeAllSessions } from '@/server/auth/session'
import { getActor, getSessionUser } from '@/server/auth/context'
import { record } from '@/server/audit/audit-service'
import { changePasswordSchema, loginSchema } from '@/shared/schemas/auth'
import type { ActorContext } from '@/server/auth/rbac'

export interface FormState {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string>
}

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

async function requestMeta() {
  const h = await headers()
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: h.get('user-agent') ?? null,
  }
}

/** Actor mínimo para auditar intentos fallidos, donde todavía no hay sesión. */
function anonymousActor(email: string, meta: { ip: string | null; userAgent: string | null }): ActorContext {
  return {
    userId: '00000000-0000-0000-0000-000000000001',
    email,
    fullName: 'Anónimo',
    roles: [],
    permissions: new Set(),
    ip: meta.ip ?? undefined,
    userAgent: meta.userAgent ?? undefined,
  }
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, fieldErrors }
  }

  const { email, password } = parsed.data
  const meta = await requestMeta()
  const user = await prisma.user.findUnique({ where: { email } })

  // Mensaje idéntico exista o no el usuario: no se revela qué correos están
  // registrados. Se verifica igualmente una contraseña falsa para que el
  // tiempo de respuesta no delate la diferencia.
  const GENERIC = 'Correo o contraseña incorrectos.'

  if (!user || !user.isActive || user.deletedAt) {
    await verifyPassword('$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0$0000000000000000000000000000000000000000000', password)
    return { ok: false, message: GENERIC }
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    return {
      ok: false,
      message: `Demasiados intentos fallidos. Vuelve a intentarlo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`,
    }
  }

  const valid = await verifyPassword(user.passwordHash, password)

  if (!valid) {
    const attempts = user.failedAttempts + 1
    const shouldLock = attempts >= MAX_ATTEMPTS
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      },
    })

    if (shouldLock) {
      await record(prisma, {
        actor: anonymousActor(email, meta),
        action: 'auth.locked',
        entityType: 'user',
        entityId: user.id,
        reason: `${MAX_ATTEMPTS} intentos fallidos consecutivos`,
        severity: 'WARNING',
      })
      return { ok: false, message: `Demasiados intentos fallidos. Cuenta bloqueada ${LOCK_MINUTES} minutos.` }
    }

    return { ok: false, message: GENERIC }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    })
    await record(tx, {
      actor: { ...anonymousActor(user.email, meta), userId: user.id, fullName: user.fullName },
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
    })
  })

  await createSession(user.id, meta)

  const volver = formData.get('volver')
  // Solo se acepta un destino interno del panel: evita redirección abierta
  // hacia un dominio de terceros.
  const destino =
    user.mustChangePassword
      ? '/admin/cambiar-clave'
      : typeof volver === 'string' && volver.startsWith('/admin') && !volver.startsWith('//')
        ? volver
        : '/admin'

  redirect(destino as Route)
}

export async function logoutAction() {
  const actor = await getActor()
  if (actor) {
    await record(prisma, { actor, action: 'auth.logout', entityType: 'user', entityId: actor.userId })
  }
  await destroyCurrentSession()
  redirect('/admin/login')
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await getSessionUser()
  if (!sessionUser) redirect('/admin/login')

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, fieldErrors }
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } })
  const valid = await verifyPassword(user.passwordHash, parsed.data.currentPassword)
  if (!valid) {
    return { ok: false, fieldErrors: { currentPassword: 'La contraseña actual no es correcta' } }
  }

  const actor = await getActor()
  const newHash = await hashPassword(parsed.data.newPassword)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    })
    if (actor) {
      await record(tx, {
        actor,
        action: 'auth.password_changed',
        entityType: 'user',
        entityId: user.id,
        severity: 'NOTICE',
      })
    }
  })

  // Cambiar la contraseña cierra las demás sesiones: si alguien más tenía
  // acceso con la anterior, lo pierde en ese momento.
  await revokeAllSessions(user.id, actor?.sessionId)

  redirect('/admin')
}
