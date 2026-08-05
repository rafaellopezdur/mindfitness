import { describe, expect, it } from 'vitest'
import { toBusinessDate } from '@/server/domain/dates'
import { allowsEntry, resolveAccess, type AccessInput } from '@/server/domain/access'
import type { MaterializedEntitlement } from '@/server/domain/memberships'

const d = toBusinessDate
const HOY = d('2026-08-04')

const vigente = {
  status: 'ACTIVE' as const,
  endDate: d('2026-09-14'),
  hasOutstandingCharge: false,
  graceDays: 0,
}

const derecho = (
  serviceCode: string,
  total: number | null,
  used = 0,
): MaterializedEntitlement => ({
  serviceCode,
  quantity: total,
  period: 'WEEK',
  rollover: false,
  quantityTotal: total,
  quantityUsed: used,
  periodStart: d('2026-08-03'),
  periodEnd: d('2026-08-09'),
})

const base = (extra: Partial<AccessInput> = {}): AccessInput => ({
  membership: vigente,
  today: HOY,
  ...extra,
})

describe('resolveAccess · vigencia', () => {
  it('sin membresía, no hay acceso', () => {
    const result = resolveAccess(base({ membership: null }))
    expect(result).toMatchObject({ outcome: 'DENIED', reason: 'NO_MEMBERSHIP' })
    expect(result.message).toBe('No se encontró una membresía activa')
    expect(result.suggestedActions).toContain('CREATE_MEMBERSHIP')
  })

  it('membresía activa deja pasar', () => {
    const result = resolveAccess(base())
    expect(result.outcome).toBe('GRANTED')
    expect(result.message).toContain('Cliente activo')
  })

  it('cliente bloqueado gana sobre todo lo demás', () => {
    const result = resolveAccess(base({ clientBlocked: true }))
    expect(result).toMatchObject({ outcome: 'DENIED', reason: 'BLOCKED' })
  })

  it('membresía pausada no deja pasar', () => {
    const result = resolveAccess(base({ membership: { ...vigente, status: 'PAUSED' } }))
    expect(result.reason).toBe('PAUSED')
    expect(allowsEntry(result)).toBe(false)
  })

  it('pendiente con saldo pide cobrar', () => {
    const result = resolveAccess(
      base({ membership: { ...vigente, status: 'PENDING', hasOutstandingCharge: true } }),
    )
    expect(result.reason).toBe('PENDING_PAYMENT')
    expect(result.suggestedActions).toContain('COLLECT_PAYMENT')
  })

  it('cancelada no deja pasar', () => {
    const result = resolveAccess(base({ membership: { ...vigente, status: 'CANCELLED' } }))
    expect(result.reason).toBe('CANCELLED')
  })
})

describe('resolveAccess · vencimiento y gracia', () => {
  it('vencida sin gracia se bloquea', () => {
    const result = resolveAccess(
      base({ membership: { ...vigente, endDate: d('2026-08-01'), graceDays: 0 } }),
    )
    expect(result).toMatchObject({ outcome: 'DENIED', reason: 'EXPIRED' })
    expect(result.suggestedActions).toContain('RENEW_MEMBERSHIP')
  })

  it('vencida dentro de la gracia deja pasar con aviso', () => {
    const result = resolveAccess(
      base({ membership: { ...vigente, endDate: d('2026-08-02'), graceDays: 3 } }),
    )
    expect(result).toMatchObject({ outcome: 'GRANTED_WITH_WARNING', reason: 'IN_GRACE' })
    expect(allowsEntry(result)).toBe(true)
  })

  it('el día del vencimiento todavía deja pasar (RN-03)', () => {
    const result = resolveAccess(base({ membership: { ...vigente, endDate: HOY } }))
    expect(result.outcome).toBe('GRANTED')
  })

  it('no confía en el estado almacenado: si la fecha pasó, está vencida', () => {
    // status ACTIVE pero endDate en el pasado, como si el job no hubiera corrido.
    const result = resolveAccess(
      base({ membership: { status: 'ACTIVE', endDate: d('2026-07-01'), hasOutstandingCharge: false, graceDays: 0 } }),
    )
    expect(result.reason).toBe('EXPIRED')
  })
})

describe('resolveAccess · servicios contratados', () => {
  it('el servicio incluido se presta', () => {
    const result = resolveAccess(
      base({ serviceCode: 'GYM_ACCESS', entitlements: [derecho('GYM_ACCESS', 6)] }),
    )
    expect(result.outcome).toBe('GRANTED')
  })

  it('el servicio NO incluido pide autorización', () => {
    const result = resolveAccess(
      base({ serviceCode: 'PERSONAL_TRAINING', entitlements: [derecho('GYM_ACCESS', 6)] }),
    )
    expect(result).toMatchObject({ outcome: 'REQUIRES_AUTHORIZATION', reason: 'SERVICE_NOT_INCLUDED' })
    expect(result.message).toBe('Cliente activo, pero su plan no incluye este servicio')
    expect(result.suggestedActions).toContain('REQUEST_AUTHORIZATION')
    expect(result.suggestedActions).toContain('CHARGE_EXTRA_SESSION')
  })

  it('sin sesiones restantes pide autorización o cobro', () => {
    const result = resolveAccess(
      base({ serviceCode: 'SEMI_PERSONAL_ADVICE', entitlements: [derecho('SEMI_PERSONAL_ADVICE', 3, 3)] }),
    )
    expect(result.reason).toBe('NO_SESSIONS_LEFT')
    expect(result.message).toBe('Cliente sin sesiones restantes')
  })

  it('una autorización vigente desbloquea el servicio no incluido', () => {
    const result = resolveAccess(
      base({
        serviceCode: 'PERSONAL_TRAINING',
        entitlements: [derecho('GYM_ACCESS', 6)],
        hasValidAuthorization: true,
      }),
    )
    expect(result).toMatchObject({ outcome: 'GRANTED', reason: 'EXCEPTIONAL_ACCESS' })
  })

  it('un derecho ilimitado nunca se agota', () => {
    const result = resolveAccess(
      base({ serviceCode: 'SPECIALIZED_TRAINER', entitlements: [derecho('SPECIALIZED_TRAINER', null, 99)] }),
    )
    expect(result.outcome).toBe('GRANTED')
  })
})

describe('resolveAccess · límite semanal (P30)', () => {
  it('por defecto avisa y deja entrar', () => {
    const result = resolveAccess(base({ weeklyVisits: { used: 6, limit: 6 } }))
    expect(result).toMatchObject({ outcome: 'GRANTED_WITH_WARNING', reason: 'WEEKLY_LIMIT_REACHED' })
    expect(result.message).toContain('lleva 6 de 6')
    expect(allowsEntry(result)).toBe(true)
  })

  it('en modo BLOCK exige autorización', () => {
    const result = resolveAccess(
      base({ weeklyVisits: { used: 6, limit: 6 }, weeklyLimitEnforcement: 'BLOCK' }),
    )
    expect(result.outcome).toBe('REQUIRES_AUTHORIZATION')
    expect(allowsEntry(result)).toBe(false)
  })

  it('en modo OFF no se controla', () => {
    const result = resolveAccess(
      base({ weeklyVisits: { used: 20, limit: 6 }, weeklyLimitEnforcement: 'OFF' }),
    )
    expect(result.outcome).toBe('GRANTED')
  })

  it('por debajo del límite no dice nada', () => {
    expect(resolveAccess(base({ weeklyVisits: { used: 2, limit: 6 } })).outcome).toBe('GRANTED')
  })
})

describe('resolveAccess · horario y entrenador', () => {
  it('fuera del horario, con control activo, pide autorización', () => {
    const result = resolveAccess(base({ schedule: { withinSlot: false, enforced: true } }))
    expect(result.reason).toBe('OUTSIDE_SCHEDULE')
  })

  it('fuera del horario sin control no molesta', () => {
    expect(resolveAccess(base({ schedule: { withinSlot: false, enforced: false } })).outcome).toBe('GRANTED')
  })

  it('asignado a otro entrenador avisa pero deja pasar', () => {
    const result = resolveAccess(
      base({ trainer: { assignedTrainerId: 't-1', requestingTrainerId: 't-2' } }),
    )
    expect(result).toMatchObject({ outcome: 'GRANTED_WITH_WARNING', reason: 'ASSIGNED_TO_OTHER_TRAINER' })
    expect(result.message).toBe('Cliente asignado a otro entrenador')
  })

  it('con el mismo entrenador no avisa', () => {
    const result = resolveAccess(
      base({ trainer: { assignedTrainerId: 't-1', requestingTrainerId: 't-1' } }),
    )
    expect(result.outcome).toBe('GRANTED')
  })

  it('P33 · sin asignación explícita no salta la alerta', () => {
    const result = resolveAccess(base({ trainer: { assignedTrainerId: null, requestingTrainerId: 't-9' } }))
    expect(result.outcome).toBe('GRANTED')
  })
})

describe('mensajes · todos en español y sin jerga', () => {
  it('ningún mensaje contiene códigos técnicos', () => {
    const casos: AccessInput[] = [
      base({ membership: null }),
      base({ clientBlocked: true }),
      base({ membership: { ...vigente, status: 'PAUSED' } }),
      base({ serviceCode: 'X', entitlements: [] }),
      base({ weeklyVisits: { used: 6, limit: 6 } }),
    ]
    for (const caso of casos) {
      const { message } = resolveAccess(caso)
      expect(message).not.toMatch(/[A-Z]{2,}_[A-Z]/)
      expect(message.length).toBeGreaterThan(5)
    }
  })
})
