import { describe, expect, it } from 'vitest'
import {
  assertCan,
  assertCanWithReason,
  can,
  canApproveAuthorization,
  canModifyUserRoles,
  canSeeMoney,
  canSeeOwnSettlement,
  ForbiddenError,
  ReasonRequiredError,
  resolveClientScope,
  type ActorContext,
} from '@/server/auth/rbac'
import {
  ALL_PERMISSIONS,
  PERMISSIONS as P,
  ROLE_SEED,
  type Permission,
  type RoleCode,
} from '@/shared/constants/permissions'

/** Construye un actor con los permisos reales del rol sembrado. */
function actorWithRole(role: RoleCode, overrides: Partial<ActorContext> = {}): ActorContext {
  const seed = ROLE_SEED[role]
  const permissions = seed.permissions === 'ALL' ? ALL_PERMISSIONS : seed.permissions
  return {
    userId: `user-${role}`,
    email: `${role.toLowerCase()}@test.co`,
    fullName: role,
    roles: [role],
    permissions: new Set<Permission>(permissions),
    ...overrides,
  }
}

const owner = actorWithRole('OWNER')
const frontDesk = actorWithRole('FRONT_DESK')
const trainer = actorWithRole('TRAINER', { trainerId: 'trainer-1' })

describe('matriz de permisos · OWNER', () => {
  it('tiene todos los permisos del catálogo', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(can(owner, permission)).toBe(true)
    }
  })
})

describe('matriz de permisos · RECEPCIÓN', () => {
  it.each([
    P.CLIENT_CREATE,
    P.PAYMENT_CREATE_CASH,
    P.ATTENDANCE_CREATE,
    P.MEMBERSHIP_CREATE,
    P.COLLECTION_READ,
    P.ACCESS_CARD_READ,
  ])('puede %s', (permission) => {
    expect(can(frontDesk, permission)).toBe(true)
  })

  it.each([
    P.PAYMENT_VOID,
    P.PAYMENT_REFUND,
    P.PLAN_CREATE,
    P.PLAN_PRICE_UPDATE,
    P.MEMBERSHIP_CANCEL,
    P.MEMBERSHIP_EXTEND,
    P.CLIENT_UPDATE_SENSITIVE,
    P.SETTINGS_UPDATE_CRITICAL,
    P.USER_CREATE,
    P.AUDIT_READ,
    P.REPORT_FINANCIAL_READ,
    P.EXPENSE_READ,
    P.AUTHORIZATION_APPROVE,
  ])('NO puede %s', (permission) => {
    expect(can(frontDesk, permission)).toBe(false)
  })
})

describe('matriz de permisos · ENTRENADOR', () => {
  it.each([P.ACCESS_CARD_READ, P.ATTENDANCE_CREATE, P.SERVICE_USAGE_CREATE, P.AUTHORIZATION_REQUEST, P.SCHEDULE_READ])(
    'puede %s',
    (permission) => {
      expect(can(trainer, permission)).toBe(true)
    },
  )

  it.each([
    P.PAYMENT_READ,
    P.CHARGE_READ,
    P.COLLECTION_READ,
    P.EXPENSE_READ,
    P.FINANCE_DASHBOARD_READ,
    P.PROFITABILITY_READ,
    P.TRAINER_SETTLEMENT_READ,
    P.REPORT_FINANCIAL_READ,
    P.CLIENT_READ,
    P.AUTHORIZATION_APPROVE,
    P.SETTINGS_READ,
  ])('NO puede %s', (permission) => {
    expect(can(trainer, permission)).toBe(false)
  })

  it('no ve ninguna información monetaria del gimnasio', () => {
    expect(canSeeMoney(trainer)).toBe(false)
  })

  it('recepción y propietaria sí ven importes', () => {
    expect(canSeeMoney(frontDesk)).toBe(true)
    expect(canSeeMoney(owner)).toBe(true)
  })
})

describe('alcance de clientes · P33 el entrenador solo ve los suyos', () => {
  it('la propietaria y recepción ven a todos', () => {
    expect(resolveClientScope(owner)).toEqual({ kind: 'ALL' })
    expect(resolveClientScope(frontDesk)).toEqual({ kind: 'ALL' })
  })

  it('el entrenador queda acotado a sus asignados', () => {
    expect(resolveClientScope(trainer)).toEqual({ kind: 'ASSIGNED', trainerId: 'trainer-1' })
  })

  it('un entrenador sin ficha vinculada no ve a nadie', () => {
    const huerfano = actorWithRole('TRAINER')
    expect(resolveClientScope(huerfano)).toEqual({ kind: 'NONE' })
  })

  it('el rol CLIENTE no tiene permisos activos en la v1', () => {
    expect(resolveClientScope(actorWithRole('CLIENT'))).toEqual({ kind: 'NONE' })
  })
})

describe('liquidación propia · única excepción al bloqueo financiero del entrenador', () => {
  it('el entrenador ve la suya', () => {
    expect(canSeeOwnSettlement(trainer, 'trainer-1')).toBe(true)
  })

  it('el entrenador NO ve la de otro', () => {
    expect(canSeeOwnSettlement(trainer, 'trainer-2')).toBe(false)
  })

  it('la propietaria ve la de cualquiera', () => {
    expect(canSeeOwnSettlement(owner, 'trainer-2')).toBe(true)
  })
})

describe('salvaguardas estructurales', () => {
  it('RN-94 · nadie modifica sus propios roles, ni siquiera OWNER', () => {
    expect(canModifyUserRoles(owner, owner.userId)).toBe(false)
    expect(canModifyUserRoles(owner, 'otro-usuario')).toBe(true)
  })

  it('RN-128 · quien solicita una autorización no puede aprobarla', () => {
    expect(canApproveAuthorization(owner, owner.userId)).toBe(false)
    expect(canApproveAuthorization(owner, 'otro-usuario')).toBe(true)
  })

  it('recepción no puede aprobar autorizaciones aunque no sea quien las pidió', () => {
    expect(canApproveAuthorization(frontDesk, 'otro-usuario')).toBe(false)
  })
})

describe('motivo obligatorio en acciones sensibles (RN-92)', () => {
  it('anular un pago sin motivo se rechaza', () => {
    expect(() => assertCanWithReason(owner, P.PAYMENT_VOID)).toThrow(ReasonRequiredError)
  })

  it('un motivo demasiado corto no cuenta como motivo', () => {
    expect(() => assertCanWithReason(owner, P.PAYMENT_VOID, 'err')).toThrow(ReasonRequiredError)
  })

  it('con motivo suficiente, procede', () => {
    expect(() => assertCanWithReason(owner, P.PAYMENT_VOID, 'Cobro duplicado por error')).not.toThrow()
  })

  it('una acción no sensible no exige motivo', () => {
    expect(() => assertCanWithReason(frontDesk, P.CLIENT_CREATE)).not.toThrow()
  })

  it('el permiso se verifica antes que el motivo', () => {
    expect(() => assertCanWithReason(frontDesk, P.PAYMENT_VOID, 'un motivo válido')).toThrow(ForbiddenError)
  })
})

describe('assertCan', () => {
  it('lanza ForbiddenError con el permiso que faltó', () => {
    try {
      assertCan(trainer, P.PAYMENT_VOID)
      expect.unreachable('debió lanzar')
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError)
      expect((error as ForbiddenError).permission).toBe(P.PAYMENT_VOID)
      // El mensaje va al usuario: en español y sin jerga técnica.
      expect((error as ForbiddenError).message).toBe('No tienes permiso para realizar esta acción.')
    }
  })
})

describe('integridad del catálogo de permisos', () => {
  it('no hay códigos duplicados', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length)
  })

  it('todos siguen el formato recurso.acción', () => {
    for (const code of ALL_PERMISSIONS) {
      expect(code).toMatch(/^[a-z_]+(\.[a-z_]+)+$/)
    }
  })

  it('los permisos de los roles sembrados existen en el catálogo', () => {
    for (const [role, seed] of Object.entries(ROLE_SEED)) {
      if (seed.permissions === 'ALL') continue
      for (const permission of seed.permissions) {
        expect(ALL_PERMISSIONS, `rol ${role}`).toContain(permission)
      }
    }
  })
})
