import 'server-only'
import type { Db } from '@/server/infra/prisma'
import type { ActorContext } from '@/server/auth/rbac'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUDITORÍA
 *
 * RN-91 · Se escribe DENTRO de la misma transacción que el cambio.
 * Si falla la auditoría, falla la operación. Por eso `record()` recibe el
 * cliente transaccional (`Db`) y no el cliente global: es imposible, por
 * construcción, auditar fuera de la transacción que se está auditando.
 *
 * La tabla es append-only: sin UPDATE ni DELETE (se revoca a nivel de base).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type AuditSeverity = 'INFO' | 'NOTICE' | 'WARNING' | 'CRITICAL'

export interface AuditInput {
  actor: ActorContext
  /** Acción en formato `recurso.acción`, igual que el permiso que la habilita. */
  action: string
  entityType: string
  entityId?: string | null
  before?: unknown
  after?: unknown
  reason?: string | null
  severity?: AuditSeverity
  requestId?: string | null
}

/** Campos que jamás deben quedar escritos en la bitácora. */
const REDACTED_KEYS = new Set([
  'passwordHash',
  'password',
  'tokenHash',
  'token',
  'secret',
  'apiKey',
  'privateKey',
  'signature',
  'resumeTokenHash',
  'payoutAccount',
  'twoFactorSecret',
])

/**
 * Sustituye los valores sensibles por '[oculto]'.
 * La auditoría registra QUE cambió una contraseña, nunca cuál.
 */
export function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(redact)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  if (typeof value !== 'object') return value

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = REDACTED_KEYS.has(key) ? '[oculto]' : redact(val)
  }
  return result
}

/**
 * Calcula qué cambió realmente entre dos estados.
 * Guardar el registro entero convierte la bitácora en ruido: lo que se
 * consulta es "qué cambió", no "cómo era todo".
 */
export function diff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  if (!before) return { before: {}, after: (redact(after ?? {}) as Record<string, unknown>) }
  if (!after) return { before: (redact(before) as Record<string, unknown>), after: {} }

  const changedBefore: Record<string, unknown> = {}
  const changedAfter: Record<string, unknown> = {}

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = before[key]
    const b = after[key]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changedBefore[key] = redact(a)
      changedAfter[key] = redact(b)
    }
  }
  return { before: changedBefore, after: changedAfter }
}

/**
 * Registra un hecho auditable.
 *
 * @param db  Cliente TRANSACCIONAL. Nunca el cliente global.
 */
export async function record(db: Db, input: AuditInput): Promise<void> {
  const { actor } = input

  await db.auditLog.create({
    data: {
      actorId: actor.userId,
      // Se copian correo y rol: la bitácora debe seguir siendo legible aunque
      // el usuario se elimine más adelante.
      actorEmail: actor.email,
      actorRole: actor.roles[0] ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: (redact(input.before) ?? undefined) as never,
      after: (redact(input.after) ?? undefined) as never,
      reason: input.reason ?? null,
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
      sessionId: actor.sessionId ?? null,
      requestId: input.requestId ?? null,
      severity: input.severity ?? 'INFO',
    },
  })
}

/** Atajo para cambios con estado anterior y posterior, guardando solo el delta. */
export async function recordChange(
  db: Db,
  input: Omit<AuditInput, 'before' | 'after'> & {
    before: Record<string, unknown> | null
    after: Record<string, unknown> | null
  },
): Promise<void> {
  const delta = diff(input.before, input.after)
  await record(db, { ...input, before: delta.before, after: delta.after })
}
