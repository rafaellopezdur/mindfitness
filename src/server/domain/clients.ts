/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLIENTES · lógica pura, sin I/O
 *
 * Validación de documentos colombianos, normalización de teléfonos y texto de
 * búsqueda, y derivación del estado del cliente.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type DocumentType = 'CC' | 'CE' | 'TI' | 'PA' | 'NIT' | 'PEP' | 'PPT'

export const DOCUMENT_TYPES: { value: DocumentType; label: string; hint: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía', hint: 'Entre 6 y 10 dígitos' },
  { value: 'TI', label: 'Tarjeta de identidad', hint: 'Entre 10 y 11 dígitos' },
  { value: 'CE', label: 'Cédula de extranjería', hint: 'Entre 6 y 7 dígitos' },
  { value: 'PA', label: 'Pasaporte', hint: 'Letras y números' },
  { value: 'PEP', label: 'Permiso especial de permanencia', hint: '15 dígitos' },
  { value: 'PPT', label: 'Permiso por protección temporal', hint: 'Entre 7 y 10 dígitos' },
  { value: 'NIT', label: 'NIT', hint: 'Entre 9 y 10 dígitos' },
]

/**
 * Quita puntos, espacios y guiones: la gente escribe "1.020.345.678" y hay que
 * poder encontrarla escribiendo "1020345678".
 */
export function normalizeDocument(value: string): string {
  return value.replace(/[.\s-]/g, '').toUpperCase()
}

export interface DocumentValidation {
  ok: boolean
  message?: string
  normalized: string
}

export function validateDocument(type: DocumentType, rawValue: string): DocumentValidation {
  const normalized = normalizeDocument(rawValue)

  if (!normalized) return { ok: false, message: 'Escribe el número de documento', normalized }

  const onlyDigits = /^\d+$/.test(normalized)

  switch (type) {
    case 'CC':
      if (!onlyDigits) return { ok: false, message: 'La cédula solo lleva números', normalized }
      if (normalized.length < 6 || normalized.length > 10)
        return { ok: false, message: 'Una cédula tiene entre 6 y 10 dígitos', normalized }
      break
    case 'TI':
      if (!onlyDigits) return { ok: false, message: 'La tarjeta de identidad solo lleva números', normalized }
      if (normalized.length < 10 || normalized.length > 11)
        return { ok: false, message: 'Una tarjeta de identidad tiene 10 u 11 dígitos', normalized }
      break
    case 'CE':
      if (!onlyDigits) return { ok: false, message: 'La cédula de extranjería solo lleva números', normalized }
      if (normalized.length < 6 || normalized.length > 7)
        return { ok: false, message: 'Una cédula de extranjería tiene 6 o 7 dígitos', normalized }
      break
    case 'PEP':
      if (!onlyDigits) return { ok: false, message: 'El PEP solo lleva números', normalized }
      if (normalized.length !== 15) return { ok: false, message: 'El PEP tiene 15 dígitos', normalized }
      break
    case 'PPT':
      if (!onlyDigits) return { ok: false, message: 'El PPT solo lleva números', normalized }
      if (normalized.length < 7 || normalized.length > 10)
        return { ok: false, message: 'El PPT tiene entre 7 y 10 dígitos', normalized }
      break
    case 'NIT':
      if (!onlyDigits) return { ok: false, message: 'El NIT solo lleva números', normalized }
      if (normalized.length < 9 || normalized.length > 10)
        return { ok: false, message: 'Un NIT tiene 9 o 10 dígitos', normalized }
      break
    case 'PA':
      if (!/^[A-Z0-9]{5,20}$/.test(normalized))
        return { ok: false, message: 'El pasaporte lleva entre 5 y 20 letras o números', normalized }
      break
  }

  return { ok: true, normalized }
}

/**
 * Normaliza teléfonos colombianos a 10 dígitos.
 * Acepta lo que la gente realmente escribe: +57 300 123 4567, 300-123-4567…
 */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('57') && digits.length === 12) return digits.slice(2)
  if (digits.startsWith('057') && digits.length === 13) return digits.slice(3)
  return digits
}

export function isValidColombianMobile(value: string): boolean {
  const phone = normalizePhone(value)
  // Móvil: 10 dígitos empezando en 3. Fijo: 7 dígitos, o 10 con indicativo.
  return /^3\d{9}$/.test(phone) || /^\d{7}$/.test(phone) || /^60\d{8}$/.test(phone)
}

export function formatPhone(value: string): string {
  const phone = normalizePhone(value)
  if (/^3\d{9}$/.test(phone)) return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`
  return value
}

/** Quita tildes y pasa a minúsculas para que "Muñoz" se encuentre con "munoz". */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Texto indexado del cliente. Se guarda materializado para que la búsqueda sea
 * un solo LIKE sobre una columna indexada, sin normalizar en cada consulta.
 */
export function buildSearchText(input: {
  firstName: string
  lastName: string
  documentNumber: string
  phone: string
  email?: string | null
  code?: string | null
}): string {
  return [
    foldText(`${input.firstName} ${input.lastName}`),
    normalizeDocument(input.documentNumber).toLowerCase(),
    normalizePhone(input.phone),
    foldText(input.email ?? ''),
    foldText(input.code ?? ''),
  ]
    .filter(Boolean)
    .join(' ')
}

export function fullName(client: { firstName: string; lastName: string }): string {
  return `${client.firstName} ${client.lastName}`.trim()
}

/** MFC-00001 */
export function formatClientCode(sequence: number): string {
  return `MFC-${String(sequence).padStart(5, '0')}`
}

/* ─────────────────────────────────────────────────────────────────────────
   Estado del cliente
   ───────────────────────────────────────────────────────────────────────── */

export type ClientStatus =
  | 'PROSPECT'
  | 'REGISTRATION_PENDING'
  | 'PAYMENT_PENDING'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'PAUSED'
  | 'CANCELLED'
  | 'INACTIVE'
  | 'BLOCKED'

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  PROSPECT: 'Prospecto',
  REGISTRATION_PENDING: 'Inscripción pendiente',
  PAYMENT_PENDING: 'Pago pendiente',
  ACTIVE: 'Activo',
  EXPIRING_SOON: 'Próximo a vencer',
  EXPIRED: 'Vencido',
  PAUSED: 'Pausado',
  CANCELLED: 'Cancelado',
  INACTIVE: 'Inactivo',
  BLOCKED: 'Bloqueado',
}

export const CLIENT_STATUS_TONE: Record<ClientStatus, 'ok' | 'warn' | 'error' | 'info' | 'idle'> = {
  PROSPECT: 'info',
  REGISTRATION_PENDING: 'warn',
  PAYMENT_PENDING: 'error',
  ACTIVE: 'ok',
  EXPIRING_SOON: 'warn',
  EXPIRED: 'error',
  PAUSED: 'idle',
  CANCELLED: 'idle',
  INACTIVE: 'idle',
  BLOCKED: 'error',
}

export interface MembershipSnapshotForStatus {
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED' | 'SUPERSEDED'
  isExpiringSoon: boolean
  hasOutstandingCharge: boolean
}

/**
 * RN · El estado se CALCULA a partir de la membresía vigente. La anulación
 * manual (`statusOverride`) gana siempre y exige motivo.
 *
 * Recibe la membresía ya resuelta en lugar de consultarla: así la función
 * sigue siendo pura y se prueba sin base de datos.
 */
export function deriveClientStatus(input: {
  statusOverride?: 'BLOCKED' | 'INACTIVE' | null
  membership?: MembershipSnapshotForStatus | null
  hasPendingRegistration?: boolean
}): ClientStatus {
  if (input.statusOverride === 'BLOCKED') return 'BLOCKED'
  if (input.statusOverride === 'INACTIVE') return 'INACTIVE'

  const membership = input.membership
  if (!membership) {
    return input.hasPendingRegistration ? 'REGISTRATION_PENDING' : 'PROSPECT'
  }

  switch (membership.status) {
    case 'PENDING':
      return membership.hasOutstandingCharge ? 'PAYMENT_PENDING' : 'REGISTRATION_PENDING'
    case 'ACTIVE':
      return membership.isExpiringSoon ? 'EXPIRING_SOON' : 'ACTIVE'
    case 'PAUSED':
      return 'PAUSED'
    case 'EXPIRED':
    case 'COMPLETED':
      return 'EXPIRED'
    case 'CANCELLED':
      return 'CANCELLED'
    case 'SUPERSEDED':
      return 'ACTIVE'
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Duplicados (RN-81)
   ───────────────────────────────────────────────────────────────────────── */

export type DuplicateLevel = 'BLOCK' | 'WARN'

export interface DuplicateCandidate {
  clientId: string
  name: string
  documentMasked: string
  level: DuplicateLevel
  reason: string
}

/** Muestra `CC ***4567`: confirma identidad sin exponer la base de clientes. */
export function maskDocument(type: string, documentNumber: string): string {
  const tail = documentNumber.slice(-4)
  return `${type} ***${tail}`
}

export function classifyDuplicate(match: {
  sameDocument: boolean
  sameEmail: boolean
  samePhone: boolean
}): { level: DuplicateLevel; reason: string } | null {
  // El documento es la identidad real del cliente (RN-80): bloquea.
  if (match.sameDocument) return { level: 'BLOCK', reason: 'Ya existe un cliente con este documento' }
  if (match.sameEmail) return { level: 'WARN', reason: 'Otro cliente usa este correo' }
  if (match.samePhone) return { level: 'WARN', reason: 'Otro cliente usa este teléfono' }
  return null
}
