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

/** Vigencia real de la sesión. Es la que manda: vive en la base de datos. */
const SESSION_DAYS = 7

/**
 * La cookie dura más que la sesión a propósito.
 *
 * La autoridad sobre la validez es SIEMPRE la fila de `sessions`; la cookie
 * solo transporta el token. Si la cookie caducara junto con la sesión habría
 * que reescribirla al renovarla, y Next no permite modificar cookies durante
 * el render de una página: solo en Server Actions y Route Handlers.
 *
 * Con una cookie de vida larga, la ventana deslizante se mantiene únicamente
 * en la base de datos y no hace falta tocarla al leer.
 */
const COOKIE_DAYS = 30

/** Se extiende la caducidad solo si queda menos de esto, para no escribir en cada visita. */
const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000

const days = (n: number) => n * 24 * 60 * 60 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface SessionMeta {
  ip?: string | null
  userAgent?: string | null
}

export async function createSession(userId: string, meta: SessionMeta = {}) {
  const token = randomBytes(32).toString('base64url')

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      expiresAt: new Date(Date.now() + days(SESSION_DAYS)),
    },
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    expires: new Date(Date.now() + days(COOKIE_DAYS)),
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

  // Ventana deslizante: se extiende solo en la base de datos, y solo cuando de
  // verdad queda poco. La cookie NO se toca aquí — esto se ejecuta durante el
  // render de la página, donde Next prohíbe modificar cookies.
  if (session.expiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_MS) {
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + days(SESSION_DAYS)) },
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
