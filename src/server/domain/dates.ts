/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FECHAS DE NEGOCIO · lógica pura, sin I/O
 *
 * Regla RN-01: todo cálculo de fecha de negocio usa America/Bogota y pasa por
 * `businessToday()`. Está prohibido `new Date()` disperso por el código.
 *
 * Una fecha de negocio (inicio y fin de membresía, día de asistencia) NO es un
 * instante: es un día del calendario. Se representa como 'YYYY-MM-DD' para
 * eliminar de raíz los errores de zona horaria, y se opera anclada a medianoche
 * UTC, donde no existe horario de verano.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * NOTA IMPORTANTE — por qué no se usa date-fns aquí.
 *
 * `date-fns` opera en la zona horaria LOCAL del proceso. Anclar la fecha a
 * medianoche UTC y pasarla por `addMonths` produce un desplazamiento silencioso:
 * en un servidor en UTC-5, '2026-01-31T00:00Z' es el 30 de enero local, y
 * `31 ene + 1 mes` acaba devolviendo el 28 de febrero en lugar del 27.
 *
 * El error aparece SOLO en los días de desbordamiento de mes y SOLO en algunas
 * zonas horarias, que es la peor combinación posible. Por eso toda la aritmética
 * se hace sobre componentes UTC explícitos: es más código y no tiene sorpresas.
 * Lo detectó `tests/unit/dates.test.ts`.
 */

/** Día del calendario en formato 'YYYY-MM-DD'. */
export type BusinessDate = string & { readonly __brand: 'BusinessDate' }

export const BUSINESS_TIMEZONE = 'America/Bogota'

export type DurationUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
export type WeekStart = 'MONDAY' | 'SUNDAY'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/* ─────────────────────────────────────────────────────────────────────────
   Conversión
   ───────────────────────────────────────────────────────────────────────── */

export function toBusinessDate(value: string): BusinessDate {
  if (!ISO_DATE.test(value)) throw new Error(`Fecha de negocio inválida: "${value}". Se espera YYYY-MM-DD.`)
  return value as BusinessDate
}

/** Ancla la fecha a medianoche UTC para poder operar sin horario de verano. */
export function toUtcAnchor(date: BusinessDate): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

export function fromUtcAnchor(date: Date): BusinessDate {
  return date.toISOString().slice(0, 10) as BusinessDate
}

/**
 * El día de hoy según el reloj del gimnasio, no el del servidor.
 * Un servidor en UTC a las 02:00 debe ver todavía el día anterior en Bogotá.
 */
export function businessToday(now: Date = new Date()): BusinessDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return parts as BusinessDate
}

/** Convierte un instante a la fecha de negocio en la que ocurrió. */
export function instantToBusinessDate(instant: Date): BusinessDate {
  return businessToday(instant)
}

/* ─────────────────────────────────────────────────────────────────────────
   Aritmética
   ───────────────────────────────────────────────────────────────────────── */

const MS_PER_DAY = 86_400_000

/** Descompone 'YYYY-MM-DD' en sus tres números. */
function parts(date: BusinessDate): [year: number, month: number, day: number] {
  return [Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10))]
}

function build(year: number, month: number, day: number): BusinessDate {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}` as BusinessDate
}

/** Último día del mes indicado (mes 1-12). */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function addDays(date: BusinessDate, days: number): BusinessDate {
  const [y, m, d] = parts(date)
  const result = new Date(Date.UTC(y, m - 1, d) + days * MS_PER_DAY)
  return build(result.getUTCFullYear(), result.getUTCMonth() + 1, result.getUTCDate())
}

/**
 * Suma meses recortando al último día cuando el destino es más corto:
 *   31 ene + 1 mes → 28 feb (2026)  ·  29 feb (2028, bisiesto)
 */
export function addMonths(date: BusinessDate, months: number): BusinessDate {
  const [y, m, d] = parts(date)
  const monthIndex = m - 1 + months
  const year = y + Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12 // 0-11, normalizado para negativos
  const day = Math.min(d, lastDayOfMonth(year, month + 1))
  return build(year, month + 1, day)
}

export function addUnits(date: BusinessDate, value: number, unit: DurationUnit): BusinessDate {
  switch (unit) {
    case 'DAY':
      return addDays(date, value)
    case 'WEEK':
      return addDays(date, value * 7)
    case 'MONTH':
      return addMonths(date, value)
    case 'YEAR':
      return addMonths(date, value * 12)
  }
}

/** Días de calendario entre dos fechas (b − a). Negativo si b es anterior. */
export function daysBetween(a: BusinessDate, b: BusinessDate): number {
  const [ay, am, ad] = parts(a)
  const [by, bm, bd] = parts(b)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / MS_PER_DAY)
}

export function isBefore(a: BusinessDate, b: BusinessDate): boolean {
  return a < b
}
export function isAfter(a: BusinessDate, b: BusinessDate): boolean {
  return a > b
}
export function isSameOrBefore(a: BusinessDate, b: BusinessDate): boolean {
  return a <= b
}
export function isSameOrAfter(a: BusinessDate, b: BusinessDate): boolean {
  return a >= b
}
export function minDate(a: BusinessDate, b: BusinessDate): BusinessDate {
  return a <= b ? a : b
}
export function maxDate(a: BusinessDate, b: BusinessDate): BusinessDate {
  return a >= b ? a : b
}

/* ─────────────────────────────────────────────────────────────────────────
   Vigencia de membresías
   ───────────────────────────────────────────────────────────────────────── */

/**
 * RN-02 · Fecha de vencimiento de una membresía.
 *
 * Un mes desde el 15 de enero vence el **14 de febrero**, no el 15: la
 * membresía es válida durante TODO el día de vencimiento (RN-03), así que el
 * último día cubierto es el anterior al mismo día del mes siguiente.
 *
 *   calculateEndDate('2026-01-15', 1, 'MONTH') → '2026-02-14'
 *   calculateEndDate('2026-01-31', 1, 'MONTH') → '2026-02-27'  (2026 no bisiesto)
 *   calculateEndDate('2026-08-04', 1, 'DAY')   → '2026-08-04'  (pase diario)
 */
export function calculateEndDate(start: BusinessDate, value: number, unit: DurationUnit): BusinessDate {
  if (value <= 0) throw new Error('La duración debe ser mayor que cero.')
  return addDays(addUnits(start, value, unit), -1)
}

/** RN-03 · La membresía cubre por completo su día de vencimiento. */
export function isExpired(endDate: BusinessDate, today: BusinessDate = businessToday()): boolean {
  return isBefore(endDate, today)
}

/** RN-04 · Estado derivado, jamás almacenado. */
export function isExpiringSoon(
  endDate: BusinessDate,
  thresholdDays: number,
  today: BusinessDate = businessToday(),
): boolean {
  if (isExpired(endDate, today)) return false
  return daysBetween(today, endDate) <= thresholdDays
}

/** RN-05 · Vencida pero dentro del periodo de gracia configurado. */
export function isInGrace(
  endDate: BusinessDate,
  graceDays: number,
  today: BusinessDate = businessToday(),
): boolean {
  if (!isExpired(endDate, today)) return false
  return isSameOrBefore(today, addDays(endDate, graceDays))
}

/** Días restantes de vigencia. 0 el mismo día de vencimiento, negativo si venció. */
export function daysRemaining(endDate: BusinessDate, today: BusinessDate = businessToday()): number {
  return daysBetween(today, endDate)
}

/** Días de mora de una obligación vencida. 0 si aún no vence. */
export function daysOverdue(dueDate: BusinessDate, today: BusinessDate = businessToday()): number {
  const diff = daysBetween(dueDate, today)
  return diff > 0 ? diff : 0
}

/* ─────────────────────────────────────────────────────────────────────────
   Semanas — límites de visitas por plan
   ───────────────────────────────────────────────────────────────────────── */

/**
 * P31 · La semana del límite es de calendario, de lunes a domingo.
 * Es lo que entiende una persona cuando le dicen "3 días por semana"; una
 * ventana móvil de 7 días es más justa y no hay forma de explicarla en el
 * mostrador.
 */
export function weekBounds(
  date: BusinessDate,
  startsOn: WeekStart = 'MONDAY',
): { start: BusinessDate; end: BusinessDate } {
  const dow = toUtcAnchor(date).getUTCDay() // 0 domingo … 6 sábado
  const offset = startsOn === 'MONDAY' ? (dow + 6) % 7 : dow
  const start = addDays(date, -offset)
  return { start, end: addDays(start, 6) }
}

export function monthBounds(date: BusinessDate): { start: BusinessDate; end: BusinessDate } {
  const anchor = toUtcAnchor(date)
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1))
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0))
  return { start: fromUtcAnchor(start), end: fromUtcAnchor(end) }
}

/* ─────────────────────────────────────────────────────────────────────────
   Presentación
   ───────────────────────────────────────────────────────────────────────── */

const LONG_FORMAT = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** '2026-08-04' → '4 de agosto de 2026' */
export function formatLong(date: BusinessDate): string {
  return LONG_FORMAT.format(toUtcAnchor(date))
}

/** Texto relativo comprensible: "hoy", "mañana", "en 5 días", "hace 3 días". */
export function formatRelative(date: BusinessDate, today: BusinessDate = businessToday()): string {
  const diff = daysBetween(today, date)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'mañana'
  if (diff === -1) return 'ayer'
  if (diff > 0) return `en ${diff} días`
  return `hace ${Math.abs(diff)} días`
}
