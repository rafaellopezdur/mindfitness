import { describe, expect, it } from 'vitest'
import { toBusinessDate } from '@/server/domain/dates'
import {
  addCourtesyDays,
  availableCapacity,
  checkDiscount,
  consumeEntitlement,
  effectivePrice,
  entitlementWindow,
  materializeEntitlements,
  membershipEndDate,
  planRenewal,
  prorateCredit,
  resolveTrainer,
  resumeEndDate,
  type Assignment,
  type AssignmentScope,
  type MaterializedEntitlement,
} from '@/server/domain/memberships'

const d = toBusinessDate

describe('effectivePrice · promoción dentro de su ventana (RN-12)', () => {
  const plan = {
    price: 250_000,
    promoPrice: 199_000,
    promoStartsAt: d('2026-08-01'),
    promoEndsAt: d('2026-08-31'),
  }

  it('aplica el promocional dentro de la ventana', () => {
    expect(effectivePrice(plan, d('2026-08-15'))).toBe(199_000)
  })
  it('el primer día de la promoción ya cuenta', () => {
    expect(effectivePrice(plan, d('2026-08-01'))).toBe(199_000)
  })
  it('el último día también', () => {
    expect(effectivePrice(plan, d('2026-08-31'))).toBe(199_000)
  })
  it('antes de empezar rige el precio normal', () => {
    expect(effectivePrice(plan, d('2026-07-31'))).toBe(250_000)
  })
  it('después de terminar vuelve el precio normal', () => {
    expect(effectivePrice(plan, d('2026-09-01'))).toBe(250_000)
  })
  it('sin promoción cargada, el precio normal', () => {
    expect(effectivePrice({ price: 175_000, promoPrice: null }, d('2026-08-15'))).toBe(175_000)
  })
})

describe('membershipEndDate', () => {
  it('un plan mensual del 15 vence el 14 del mes siguiente', () => {
    expect(membershipEndDate(d('2026-08-15'), { value: 1, unit: 'MONTH' })).toBe('2026-09-14')
  })
  it('un pase diario vence el mismo día', () => {
    expect(membershipEndDate(d('2026-08-04'), { value: 1, unit: 'DAY' })).toBe('2026-08-04')
  })
  it('un plan solo por sesiones no tiene vencimiento', () => {
    expect(membershipEndDate(d('2026-08-04'), { value: null, unit: null })).toBeNull()
  })
})

describe('pausa · el reloj se detiene (RN-22)', () => {
  it('reactivar corre el vencimiento exactamente los días pausados', () => {
    const result = resumeEndDate(d('2026-09-14'), d('2026-08-10'), d('2026-08-20'))
    expect(result.pausedDays).toBe(10)
    expect(result.endDate).toBe('2026-09-24')
  })

  it('pausar y reactivar el mismo día no cambia nada', () => {
    const result = resumeEndDate(d('2026-09-14'), d('2026-08-10'), d('2026-08-10'))
    expect(result.pausedDays).toBe(0)
    expect(result.endDate).toBe('2026-09-14')
  })

  it('una pausa que cruza el fin de mes se cuenta bien', () => {
    const result = resumeEndDate(d('2026-09-14'), d('2026-08-28'), d('2026-09-03'))
    expect(result.pausedDays).toBe(6)
    expect(result.endDate).toBe('2026-09-20')
  })
})

describe('días de cortesía (RN-28)', () => {
  it('se suman al vencimiento', () => {
    expect(addCourtesyDays(d('2026-09-14'), 3)).toBe('2026-09-17')
  })
  it('rechaza cantidades no positivas', () => {
    expect(() => addCourtesyDays(d('2026-09-14'), 0)).toThrow()
  })
})

describe('planRenewal · fecha de inicio (RN-25 / RN-26)', () => {
  it('anticipada: encadena sin perder días', () => {
    const result = planRenewal({ endDate: d('2026-09-14') }, { today: d('2026-09-10') })
    expect(result.kind).toBe('ANTICIPATED')
    expect(result.startDate).toBe('2026-09-15')
    // Del 10 al 14 inclusive son 5 días que no se pierden.
    expect(result.preservedDays).toBe(5)
  })

  it('renovar el mismo día del vencimiento sigue siendo anticipada', () => {
    const result = planRenewal({ endDate: d('2026-09-14') }, { today: d('2026-09-14') })
    expect(result.kind).toBe('ANTICIPATED')
    expect(result.startDate).toBe('2026-09-15')
    expect(result.preservedDays).toBe(1)
  })

  it('vencida dentro de la gracia empieza hoy por defecto', () => {
    const result = planRenewal({ endDate: d('2026-09-14') }, { today: d('2026-09-16'), graceDays: 3 })
    expect(result.kind).toBe('WITHIN_GRACE')
    expect(result.startDate).toBe('2026-09-16')
  })

  it('con backdate activado continúa desde el vencimiento', () => {
    const result = planRenewal(
      { endDate: d('2026-09-14') },
      { today: d('2026-09-16'), graceDays: 3, backdateWithinGrace: true },
    )
    expect(result.startDate).toBe('2026-09-15')
  })

  it('vencida hace tiempo empieza hoy', () => {
    const result = planRenewal({ endDate: d('2026-07-01') }, { today: d('2026-09-16') })
    expect(result.kind).toBe('LAPSED')
    expect(result.startDate).toBe('2026-09-16')
  })

  it('sin fecha de fin (plan por sesiones) empieza hoy', () => {
    const result = planRenewal({ endDate: null }, { today: d('2026-09-16') })
    expect(result.startDate).toBe('2026-09-16')
  })
})

describe('prorateCredit · cambio de plan (RN-27)', () => {
  it('a mitad de un mes devuelve aproximadamente la mitad', () => {
    const result = prorateCredit({
      finalPrice: 300_000,
      startDate: d('2026-08-01'),
      endDate: d('2026-08-30'), // 30 días
      changeDate: d('2026-08-16'),
    })
    expect(result.totalDays).toBe(30)
    expect(result.remainingDays).toBe(15)
    expect(result.credit).toBe(150_000)
  })

  it('el primer día devuelve el total', () => {
    const result = prorateCredit({
      finalPrice: 300_000,
      startDate: d('2026-08-01'),
      endDate: d('2026-08-30'),
      changeDate: d('2026-08-01'),
    })
    expect(result.credit).toBe(300_000)
  })

  it('después del vencimiento no hay crédito', () => {
    const result = prorateCredit({
      finalPrice: 300_000,
      startDate: d('2026-08-01'),
      endDate: d('2026-08-30'),
      changeDate: d('2026-09-05'),
    })
    expect(result.credit).toBe(0)
  })

  it('redondea hacia abajo: nunca se regala dinero por el redondeo', () => {
    const result = prorateCredit({
      finalPrice: 175_000,
      startDate: d('2026-08-01'),
      endDate: d('2026-08-30'),
      changeDate: d('2026-08-16'),
    })
    // 175000 × 15 / 30 = 87500 exacto; con 14 días daría 81666,6 → 81666
    expect(result.credit).toBe(87_500)
    const odd = prorateCredit({
      finalPrice: 175_000,
      startDate: d('2026-08-01'),
      endDate: d('2026-08-30'),
      changeDate: d('2026-08-17'),
    })
    expect(odd.credit).toBe(81_666)
  })

  it('un plan sin vencimiento no genera crédito', () => {
    expect(prorateCredit({ finalPrice: 300_000, startDate: d('2026-08-01'), endDate: null }).credit).toBe(0)
  })
})

describe('checkDiscount (RN-44)', () => {
  const base = { listPrice: 250_000, maxPercentForRole: 0, planAllowsDiscount: true }

  it('sin descuento, todo en orden', () => {
    expect(checkDiscount({ ...base, discountAmount: 0 })).toMatchObject({ ok: true, requiresApproval: false })
  })

  it('con tope 0, cualquier descuento requiere aprobación', () => {
    const result = checkDiscount({ ...base, discountAmount: 25_000 })
    expect(result).toMatchObject({ ok: true, requiresApproval: true, percent: 10 })
  })

  it('dentro del tope del rol no requiere aprobación', () => {
    const result = checkDiscount({ ...base, discountAmount: 25_000, maxPercentForRole: 15 })
    expect(result.requiresApproval).toBe(false)
  })

  it('rechaza un descuento mayor que el precio', () => {
    expect(checkDiscount({ ...base, discountAmount: 300_000 }).ok).toBe(false)
  })

  it('rechaza si el plan no admite descuentos', () => {
    expect(checkDiscount({ ...base, discountAmount: 10_000, planAllowsDiscount: false }).ok).toBe(false)
  })

  it('respeta el tope propio del plan', () => {
    const result = checkDiscount({ ...base, discountAmount: 50_000, planMaxPercent: 10 })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('10%')
  })
})

describe('derechos · ventana y consumo', () => {
  it('la ventana semanal va de lunes a domingo', () => {
    expect(entitlementWindow('WEEK', d('2026-08-04'))).toEqual({ start: '2026-08-03', end: '2026-08-09' })
  })
  it('la ventana total no tiene límites', () => {
    expect(entitlementWindow('TOTAL', d('2026-08-04'))).toEqual({ start: null, end: null })
  })

  it('materializa las reglas del plan congelando la ventana', () => {
    const result = materializeEntitlements(
      [{ serviceCode: 'GYM_ACCESS', quantity: 3, period: 'WEEK', rollover: false }],
      d('2026-08-04'),
    )
    expect(result[0]).toMatchObject({
      quantityTotal: 3,
      quantityUsed: 0,
      periodStart: '2026-08-03',
      periodEnd: '2026-08-09',
    })
  })

  const semanal = (used: number, rollover = false): MaterializedEntitlement => ({
    serviceCode: 'GYM_ACCESS',
    quantity: 3,
    period: 'WEEK',
    rollover,
    quantityTotal: 3,
    quantityUsed: used,
    periodStart: d('2026-08-03'),
    periodEnd: d('2026-08-09'),
  })

  it('consume mientras queden unidades', () => {
    expect(consumeEntitlement(semanal(1), d('2026-08-05'))).toEqual({
      ok: true,
      remaining: 1,
      periodReset: false,
    })
  })

  it('se agota al llegar al límite', () => {
    expect(consumeEntitlement(semanal(3), d('2026-08-05'))).toEqual({
      ok: false,
      reason: 'EXHAUSTED',
      remaining: 0,
    })
  })

  it('la semana siguiente reinicia el contador', () => {
    // Agotado dentro de su semana, pero el 10 de agosto es otra semana.
    const result = consumeEntitlement(semanal(3), d('2026-08-10'))
    expect(result).toMatchObject({ ok: true, periodReset: true })
  })

  it('sin rollover, lo no usado se pierde (P32)', () => {
    const result = consumeEntitlement(semanal(1), d('2026-08-10'))
    // Quedaban 2 sin usar, pero la semana nueva empieza otra vez en 3.
    expect(result).toMatchObject({ ok: true, remaining: 2, periodReset: true })
  })

  it('con rollover, lo no usado se arrastra', () => {
    const result = consumeEntitlement(semanal(1, true), d('2026-08-10'))
    // 3 del periodo nuevo + 2 arrastradas = 5; se consume una, quedan 4.
    expect(result).toMatchObject({ ok: true, remaining: 4 })
  })

  it('un derecho ilimitado siempre alcanza', () => {
    const ilimitado: MaterializedEntitlement = {
      serviceCode: 'SPECIALIZED_TRAINER',
      quantity: null,
      period: 'TOTAL',
      rollover: false,
      quantityTotal: null,
      quantityUsed: 999,
      periodStart: null,
      periodEnd: null,
    }
    expect(consumeEntitlement(ilimitado, d('2026-08-05'))).toEqual({
      ok: true,
      remaining: null,
      periodReset: false,
    })
  })
})

describe('availableCapacity (RN-70)', () => {
  it('descuenta inscritos y reservas vigentes', () => {
    expect(availableCapacity({ capacity: 10, activeEnrollments: 6, heldReservations: 2 })).toBe(2)
  })
  it('nunca es negativo aunque haya sobrecupo', () => {
    expect(availableCapacity({ capacity: 5, activeEnrollments: 7, heldReservations: 0 })).toBe(0)
  })
})

describe('resolveTrainer · precedencia (RN-132)', () => {
  const make = (
    scope: AssignmentScope,
    role: Assignment['role'] = 'PRIMARY',
    id: string = scope,
    createdAt = '2026-01-01',
  ): Assignment => ({ trainerId: `t-${id}`, scope, role, createdAt })

  it('sin asignaciones no hay entrenador', () => {
    expect(resolveTrainer([])).toBeNull()
  })

  it('la suplencia gana a todo', () => {
    const result = resolveTrainer([make('CLIENT'), make('TEMPORARY'), make('MEMBERSHIP')])
    expect(result?.scope).toBe('TEMPORARY')
  })

  it('la membresía gana al cliente', () => {
    expect(resolveTrainer([make('CLIENT'), make('MEMBERSHIP')])?.scope).toBe('MEMBERSHIP')
  })

  it('el cliente gana a la franja', () => {
    expect(resolveTrainer([make('SLOT'), make('CLIENT')])?.scope).toBe('CLIENT')
  })

  it('la franja gana al plan · P33: el entrenador es el de turno', () => {
    expect(resolveTrainer([make('PLAN'), make('SLOT')])?.scope).toBe('SLOT')
  })

  it('a igual alcance manda PRIMARY', () => {
    const result = resolveTrainer([make('SLOT', 'SUPPORT', 'apoyo'), make('SLOT', 'PRIMARY', 'titular')])
    expect(result?.trainerId).toBe('t-titular')
  })

  it('empatando alcance y papel, gana la más reciente', () => {
    const result = resolveTrainer([
      make('SLOT', 'PRIMARY', 'vieja', '2026-01-01'),
      make('SLOT', 'PRIMARY', 'nueva', '2026-08-01'),
    ])
    expect(result?.trainerId).toBe('t-nueva')
  })
})
