import 'server-only'
import { hash, verify } from '@node-rs/argon2'

/**
 * Contraseñas con Argon2id.
 *
 * Parámetros según las recomendaciones de OWASP (19 MiB, 2 iteraciones,
 * paralelismo 1). No se usa bcrypt: Argon2id resiste mejor el ataque con GPU.
 */
const ARGON_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON_OPTIONS)
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain)
  } catch {
    // Un hash corrupto o de otro algoritmo no debe tumbar el inicio de sesión:
    // se trata como credencial incorrecta.
    return false
  }
}

/** Política mínima. Se valida en el servidor, no solo en el formulario. */
export const PASSWORD_MIN_LENGTH = 10

export function describePasswordPolicy(): string {
  return `Al menos ${PASSWORD_MIN_LENGTH} caracteres, con una mayúscula, una minúscula y un número.`
}

export function isPasswordStrongEnough(plain: string): boolean {
  return (
    plain.length >= PASSWORD_MIN_LENGTH &&
    /[a-záéíóúñ]/.test(plain) &&
    /[A-ZÁÉÍÓÚÑ]/.test(plain) &&
    /[0-9]/.test(plain)
  )
}

/**
 * Contraseña temporal legible para entregar en mano al crear un usuario.
 * Se marca `mustChangePassword` y se obliga a cambiarla en el primer ingreso.
 */
export function generateTemporaryPassword(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // sin I ni O: se confunden con 1 y 0
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const pick = (set: string, n: number) =>
    Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('')
  return `${pick(letters, 3)}${pick(lower, 5)}${pick(digits, 4)}`
}
