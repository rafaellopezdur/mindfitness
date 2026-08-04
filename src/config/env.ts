/**
 * Validación de variables de entorno al arrancar.
 *
 * Si falta una variable obligatoria, la aplicación NO arranca: es preferible
 * un fallo ruidoso en el despliegue a un error silencioso a las tres semanas.
 *
 * Este módulo es SOLO de servidor. Ninguna llave secreta puede llevar el
 * prefijo NEXT_PUBLIC_ (docs/01-arquitectura.md §7).
 */

import 'server-only'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL de conexión válida'),
  /** Conexión directa para migraciones (Prisma no migra sobre el pooler de transacciones). */
  DIRECT_URL: z.string().url().optional(),

  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET debe tener al menos 32 caracteres'),
  AUTH_URL: z.string().url().default('http://localhost:3000'),

  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  CRON_SECRET: z.string().min(16).optional(),

  // Adaptadores intercambiables. `mock` y `console` permiten desarrollar y
  // probar el flujo completo sin depender de ningún proveedor externo.
  PAYMENT_PROVIDER: z.enum(['mock', 'wompi', 'mercadopago', 'epayco']).default('mock'),
  PAYMENT_PUBLIC_KEY: z.string().optional(),
  PAYMENT_PRIVATE_KEY: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),

  EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Mind Fitness Club <hola@mindfitnessclub.com.co>'),

  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
})

/** Un proveedor real exige sus llaves; el mock, no. Se comprueba aquí, no en producción. */
const envWithProviderChecks = envSchema.superRefine((env, ctx) => {
  if (env.PAYMENT_PROVIDER !== 'mock') {
    for (const key of ['PAYMENT_PUBLIC_KEY', 'PAYMENT_PRIVATE_KEY', 'PAYMENT_WEBHOOK_SECRET'] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} es obligatoria cuando PAYMENT_PROVIDER es "${env.PAYMENT_PROVIDER}"`,
        })
      }
    }
  }
  if (env.EMAIL_PROVIDER !== 'console' && !env.EMAIL_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['EMAIL_API_KEY'],
      message: 'EMAIL_API_KEY es obligatoria cuando EMAIL_PROVIDER no es "console"',
    })
  }
  if (env.STORAGE_PROVIDER === 's3' && !env.STORAGE_BUCKET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['STORAGE_BUCKET'],
      message: 'STORAGE_BUCKET es obligatoria cuando STORAGE_PROVIDER es "s3"',
    })
  }
  if (env.NODE_ENV === 'production' && !env.CRON_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CRON_SECRET'],
      message: 'CRON_SECRET es obligatoria en producción: los endpoints de cron deben ir firmados',
    })
  }
})

function loadEnv() {
  const parsed = envWithProviderChecks.safeParse(process.env)

  if (!parsed.success) {
    const detalle = parsed.error.issues.map((i) => `  · ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(
      `\n❌ Variables de entorno inválidas:\n${detalle}\n\n` +
        `Revisa tu archivo .env (usa .env.example como referencia).\n`,
    )
  }

  return parsed.data
}

export const env = loadEnv()

export type Env = typeof env
export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
