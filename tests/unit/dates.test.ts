import { describe, expect, it } from 'vitest'
import {
  addDays,
  businessToday,
  calculateEndDate,
  daysOverdue,
  daysRemaining,
  formatRelative,
  isExpired,
  isExpiringSoon,
  isInGrace,
  monthBounds,
  toBusinessDate,
  weekBounds,
} from '@/server/domain/dates'

const d = toBusinessDate

describe('businessToday · zona horaria del gimnasio (RN-01)', () => {
  it('a las 02:00 UTC todavía es el día anterior en Bogotá', () => {
    // 5 de agosto 02:00 UTC = 4 de agosto 21:00 en Bogotá (UTC-5)
    expect(businessToday(new Date('2026-08-05T02:00:00Z'))).toBe('2026-08-04')
  })

  it('a las 06:00 UTC ya es el día siguiente en Bogotá', () => {
    expect(businessToday(new Date('2026-08-05T06:00:00Z'))).toBe('2026-08-05')
  })

  it('el cambio de día ocurre exactamente a las 05:00 UTC', () => {
    expect(businessToday(new Date('2026-08-05T04:59:59Z'))).toBe('2026-08-04')
    expect(businessToday(new Date('2026-08-05T05:00:00Z'))).toBe('2026-08-05')
  })
})

describe('calculateEndDate · vencimiento de membresía (RN-02)', () => {
  it('un mes desde el 15 de enero vence el 14 de febrero, no el 15', () => {
    expect(calculateEndDate(d('2026-01-15'), 1, 'MONTH')).toBe('2026-02-14')
  })

  it('resuelve el desbordamiento de fin de mes: 31 de enero + 1 mes', () => {
    // 2026 no es bisiesto: 31 ene + 1 mes → 28 feb, menos un día → 27 feb
    expect(calculateEndDate(d('2026-01-31'), 1, 'MONTH')).toBe('2026-02-27')
  })

  it('respeta el año bisiesto', () => {
    expect(calculateEndDate(d('2028-01-31'), 1, 'MONTH')).toBe('2028-02-28')
  })

  it('un pase diario vence el mismo día', () => {
    expect(calculateEndDate(d('2026-08-04'), 1, 'DAY')).toBe('2026-08-04')
  })

  it('cruza el fin de año', () => {
    expect(calculateEndDate(d('2026-12-15'), 1, 'MONTH')).toBe('2027-01-14')
  })

  it('un plan anual', () => {
    expect(calculateEndDate(d('2026-08-04'), 1, 'YEAR')).toBe('2027-08-03')
  })

  it('una duración en semanas', () => {
    expect(calculateEndDate(d('2026-08-04'), 2, 'WEEK')).toBe('2026-08-17')
  })

  it('el 29 de febrero de un bisiesto + 1 año recorta al 28', () => {
    expect(calculateEndDate(d('2028-02-29'), 1, 'YEAR')).toBe('2029-02-27')
  })

  it('rechaza duraciones no positivas', () => {
    expect(() => calculateEndDate(d('2026-08-04'), 0, 'MONTH')).toThrow()
  })
})

describe('isExpired · la membresía cubre todo su día de vencimiento (RN-03)', () => {
  it('no está vencida el mismo día del vencimiento', () => {
    expect(isExpired(d('2026-08-04'), d('2026-08-04'))).toBe(false)
  })

  it('está vencida al día siguiente', () => {
    expect(isExpired(d('2026-08-04'), d('2026-08-05'))).toBe(true)
  })
})

describe('isExpiringSoon · estado derivado (RN-04)', () => {
  const hoy = d('2026-08-04')

  it('avisa dentro del umbral', () => {
    expect(isExpiringSoon(d('2026-08-08'), 5, hoy)).toBe(true)
  })

  it('no avisa fuera del umbral', () => {
    expect(isExpiringSoon(d('2026-08-20'), 5, hoy)).toBe(false)
  })

  it('una membresía ya vencida no es "próxima a vencer"', () => {
    expect(isExpiringSoon(d('2026-08-01'), 5, hoy)).toBe(false)
  })

  it('el día exacto del umbral entra', () => {
    expect(isExpiringSoon(d('2026-08-09'), 5, hoy)).toBe(true)
  })
})

describe('isInGrace · periodo de gracia (RN-05)', () => {
  it('sin gracia configurada, nunca hay gracia', () => {
    expect(isInGrace(d('2026-08-04'), 0, d('2026-08-05'))).toBe(false)
  })

  it('con 3 días de gracia, el tercero todavía cuenta', () => {
    expect(isInGrace(d('2026-08-04'), 3, d('2026-08-07'))).toBe(true)
  })

  it('el cuarto día ya está fuera', () => {
    expect(isInGrace(d('2026-08-04'), 3, d('2026-08-08'))).toBe(false)
  })

  it('una membresía vigente no está en gracia', () => {
    expect(isInGrace(d('2026-08-10'), 3, d('2026-08-04'))).toBe(false)
  })
})

describe('weekBounds · semana de lunes a domingo (P31)', () => {
  it('un martes devuelve el lunes anterior y el domingo siguiente', () => {
    // 2026-08-04 es martes
    expect(weekBounds(d('2026-08-04'))).toEqual({ start: '2026-08-03', end: '2026-08-09' })
  })

  it('el domingo cierra su propia semana, no abre la siguiente', () => {
    expect(weekBounds(d('2026-08-09'))).toEqual({ start: '2026-08-03', end: '2026-08-09' })
  })

  it('el lunes abre la semana', () => {
    expect(weekBounds(d('2026-08-03'))).toEqual({ start: '2026-08-03', end: '2026-08-09' })
  })

  it('con semana que inicia en domingo, el resultado cambia', () => {
    expect(weekBounds(d('2026-08-04'), 'SUNDAY')).toEqual({ start: '2026-08-02', end: '2026-08-08' })
  })
})

describe('monthBounds', () => {
  it('devuelve el primero y el último día del mes', () => {
    expect(monthBounds(d('2026-08-04'))).toEqual({ start: '2026-08-01', end: '2026-08-31' })
  })

  it('resuelve febrero no bisiesto', () => {
    expect(monthBounds(d('2026-02-10'))).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })
})

describe('días restantes y mora', () => {
  it('el día del vencimiento quedan 0 días', () => {
    expect(daysRemaining(d('2026-08-04'), d('2026-08-04'))).toBe(0)
  })

  it('la mora es 0 antes del vencimiento', () => {
    expect(daysOverdue(d('2026-08-10'), d('2026-08-04'))).toBe(0)
  })

  it('la mora cuenta desde el día siguiente al vencimiento', () => {
    expect(daysOverdue(d('2026-08-01'), d('2026-08-04'))).toBe(3)
  })
})

describe('formatRelative · lenguaje comprensible, sin jerga', () => {
  const hoy = d('2026-08-04')
  it.each([
    [d('2026-08-04'), 'hoy'],
    [d('2026-08-05'), 'mañana'],
    [d('2026-08-03'), 'ayer'],
    [d('2026-08-09'), 'en 5 días'],
    [d('2026-08-01'), 'hace 3 días'],
  ])('%s → %s', (fecha, esperado) => {
    expect(formatRelative(fecha, hoy)).toBe(esperado)
  })
})

describe('addDays', () => {
  it('cruza el cambio de mes', () => {
    expect(addDays(d('2026-08-31'), 1)).toBe('2026-09-01')
  })
  it('acepta desplazamientos negativos', () => {
    expect(addDays(d('2026-09-01'), -1)).toBe('2026-08-31')
  })
})

describe('validación de formato', () => {
  it('rechaza una fecha mal formada', () => {
    expect(() => toBusinessDate('04/08/2026')).toThrow()
    expect(() => toBusinessDate('2026-8-4')).toThrow()
  })
})
