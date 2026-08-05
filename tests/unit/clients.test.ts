import { describe, expect, it } from 'vitest'
import {
  buildSearchText,
  classifyDuplicate,
  deriveClientStatus,
  foldText,
  formatClientCode,
  formatPhone,
  isValidColombianMobile,
  maskDocument,
  normalizeDocument,
  normalizePhone,
  validateDocument,
} from '@/server/domain/clients'

describe('normalizeDocument · la gente escribe con puntos', () => {
  it.each([
    ['1.020.345.678', '1020345678'],
    ['1 020 345 678', '1020345678'],
    ['1020-345-678', '1020345678'],
    ['ab123456', 'AB123456'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeDocument(input)).toBe(expected)
  })
})

describe('validateDocument', () => {
  it('acepta una cédula normal', () => {
    expect(validateDocument('CC', '1020345678')).toMatchObject({ ok: true, normalized: '1020345678' })
  })

  it('acepta una cédula escrita con puntos', () => {
    expect(validateDocument('CC', '1.020.345.678').ok).toBe(true)
  })

  it('rechaza una cédula con letras', () => {
    const result = validateDocument('CC', '10203456AB')
    expect(result.ok).toBe(false)
    expect(result.message).toBe('La cédula solo lleva números')
  })

  it('rechaza una cédula demasiado corta', () => {
    expect(validateDocument('CC', '12345').ok).toBe(false)
  })

  it('acepta cédulas antiguas de 8 dígitos', () => {
    expect(validateDocument('CC', '79123456').ok).toBe(true)
  })

  it('exige 15 dígitos en el PEP', () => {
    expect(validateDocument('PEP', '123456789012345').ok).toBe(true)
    expect(validateDocument('PEP', '12345').ok).toBe(false)
  })

  it('el pasaporte admite letras y números', () => {
    expect(validateDocument('PA', 'AX123456').ok).toBe(true)
    expect(validateDocument('PA', 'AB').ok).toBe(false)
  })

  it('rechaza el vacío con un mensaje claro', () => {
    expect(validateDocument('CC', '   ')).toMatchObject({
      ok: false,
      message: 'Escribe el número de documento',
    })
  })
})

describe('normalizePhone · formatos reales colombianos', () => {
  it.each([
    ['+57 300 123 4567', '3001234567'],
    ['300 123 4567', '3001234567'],
    ['300-123-4567', '3001234567'],
    ['573001234567', '3001234567'],
    ['3001234567', '3001234567'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })
})

describe('isValidColombianMobile', () => {
  it('acepta un móvil de 10 dígitos que empieza en 3', () => {
    expect(isValidColombianMobile('3001234567')).toBe(true)
  })
  it('acepta un fijo de 7 dígitos', () => {
    expect(isValidColombianMobile('2345678')).toBe(true)
  })
  it('acepta un fijo nuevo con indicativo 60', () => {
    expect(isValidColombianMobile('6012345678')).toBe(true)
  })
  it('rechaza un número corto', () => {
    expect(isValidColombianMobile('12345')).toBe(false)
  })
})

describe('formatPhone', () => {
  it('agrupa el móvil para que se lea de un vistazo', () => {
    expect(formatPhone('3001234567')).toBe('300 123 4567')
  })
})

describe('foldText · buscar sin pelear con las tildes', () => {
  it.each([
    ['Muñoz', 'munoz'],
    ['MARÍA JOSÉ', 'maria jose'],
    ['  Ana  ', 'ana'],
  ])('%s → %s', (input, expected) => {
    expect(foldText(input)).toBe(expected)
  })
})

describe('buildSearchText', () => {
  const texto = buildSearchText({
    firstName: 'María José',
    lastName: 'Muñoz',
    documentNumber: '1.020.345.678',
    phone: '+57 300 123 4567',
    email: 'Maria@Test.CO',
    code: 'MFC-00007',
  })

  it.each([
    ['maria', 'nombre con tilde'],
    ['munoz', 'apellido con ñ'],
    ['1020345678', 'documento sin puntos'],
    ['3001234567', 'teléfono normalizado'],
    ['maria@test.co', 'correo en minúsculas'],
    ['mfc-00007', 'código interno'],
  ])('contiene "%s" (%s)', (fragment) => {
    expect(texto).toContain(fragment)
  })
})

describe('formatClientCode', () => {
  it('rellena con ceros a la izquierda', () => {
    expect(formatClientCode(1)).toBe('MFC-00001')
    expect(formatClientCode(1234)).toBe('MFC-01234')
  })
})

describe('deriveClientStatus · el estado se calcula (docs/05 §10)', () => {
  it('sin membresía es un prospecto', () => {
    expect(deriveClientStatus({})).toBe('PROSPECT')
  })

  it('con inscripción en curso, inscripción pendiente', () => {
    expect(deriveClientStatus({ hasPendingRegistration: true })).toBe('REGISTRATION_PENDING')
  })

  it('membresía pendiente con saldo → pago pendiente', () => {
    expect(
      deriveClientStatus({
        membership: { status: 'PENDING', isExpiringSoon: false, hasOutstandingCharge: true },
      }),
    ).toBe('PAYMENT_PENDING')
  })

  it('membresía activa → activo', () => {
    expect(
      deriveClientStatus({
        membership: { status: 'ACTIVE', isExpiringSoon: false, hasOutstandingCharge: false },
      }),
    ).toBe('ACTIVE')
  })

  it('activa y cerca de vencer → próximo a vencer', () => {
    expect(
      deriveClientStatus({
        membership: { status: 'ACTIVE', isExpiringSoon: true, hasOutstandingCharge: false },
      }),
    ).toBe('EXPIRING_SOON')
  })

  it('las sesiones agotadas se leen como vencido', () => {
    expect(
      deriveClientStatus({
        membership: { status: 'COMPLETED', isExpiringSoon: false, hasOutstandingCharge: false },
      }),
    ).toBe('EXPIRED')
  })

  it('la anulación manual gana sobre el cálculo', () => {
    expect(
      deriveClientStatus({
        statusOverride: 'BLOCKED',
        membership: { status: 'ACTIVE', isExpiringSoon: false, hasOutstandingCharge: false },
      }),
    ).toBe('BLOCKED')
  })

  it('bloquear pesa más que marcar inactivo', () => {
    expect(deriveClientStatus({ statusOverride: 'BLOCKED' })).toBe('BLOCKED')
    expect(deriveClientStatus({ statusOverride: 'INACTIVE' })).toBe('INACTIVE')
  })
})

describe('duplicados (RN-81)', () => {
  it('el documento repetido bloquea', () => {
    expect(classifyDuplicate({ sameDocument: true, sameEmail: false, samePhone: false })).toEqual({
      level: 'BLOCK',
      reason: 'Ya existe un cliente con este documento',
    })
  })

  it('el correo repetido solo advierte', () => {
    expect(classifyDuplicate({ sameDocument: false, sameEmail: true, samePhone: false })?.level).toBe('WARN')
  })

  it('el teléfono repetido solo advierte', () => {
    expect(classifyDuplicate({ sameDocument: false, sameEmail: false, samePhone: true })?.level).toBe('WARN')
  })

  it('sin coincidencias no hay duplicado', () => {
    expect(classifyDuplicate({ sameDocument: false, sameEmail: false, samePhone: false })).toBeNull()
  })

  it('el documento manda aunque coincidan otros campos', () => {
    expect(classifyDuplicate({ sameDocument: true, sameEmail: true, samePhone: true })?.level).toBe('BLOCK')
  })
})

describe('maskDocument · no exponer la base de clientes (RN-112)', () => {
  it('muestra solo los últimos cuatro dígitos', () => {
    expect(maskDocument('CC', '1020345678')).toBe('CC ***5678')
  })
})
