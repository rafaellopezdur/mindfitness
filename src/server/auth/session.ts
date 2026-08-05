import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { prisma } from '@/server/infra/prisma'
import { isProduction } from '@/config/env'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SESIONES
 *
 * La sesión vive en la base de datos, no en un JWT (ADR-0004 / RN-90):
 * revocar el acceso de alguien debe surtir efecto de inmediato, no cuando
 * expire un token que ya está en su navegador.
 *
 * En la tabla se guarda el HASH del token, nunca el token. Si alguien lee la
 * base de datos, no puede suplantar a nadie.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const SESSION_COOKIE = 'mfc_session'
const SESSION_DAYS = 7
/** Se renueva la caducidad solo si queda menos de esto, para no escribir en cada visita. */
const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface SessionMeta {
  ip?: string | null
  userAgent?: string | null
}

export async function createSession(userId: string, meta: SessionMeta = {}) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      expiresAt,
    },
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    expires: expiresAt,
  })

  return session
}

/** Devuelve la sesión vigente con su usuario, roles y permisos, o null. */
export async function readSession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: { include: { permissions: { include: { permission: true } } } },
            },
          },
        },
      },
    },
  })

  if (!session) return null
  if (session.revokedAt) return null
  if (session.expiresAt.getTime() <= Date.now()) return null
  if (!session.user.isActive || session.user.deletedAt) return null

  // Renovación perezosa: solo se escribe cuando de verdad queda poco.
  if (session.expiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_MS) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt } })
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      expires: expiresAt,
    })
  }

  return session
}

export async function destroyCurrentSession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
  store.delete(SESSION_COOKIE)
}

/** Cierra todas las sesiones de un usuario. Se usa al cambiar la contraseña. */
export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  return prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  })
}

/**
 * Comparación en tiempo constante. Evita que el tiempo de respuesta revele
 * cuánto de un valor secreto coincide.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
