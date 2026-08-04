import 'server-only'
import { PrismaClient } from '@prisma/client'
import { isDevelopment } from '@/config/env'

/**
 * Cliente Prisma único.
 *
 * En desarrollo se guarda en `globalThis` para que el recargado en caliente de
 * Next no abra una conexión nueva en cada cambio y agote el pool de Postgres.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment ? ['warn', 'error'] : ['error'],
  })

if (isDevelopment) globalForPrisma.prisma = prisma

/**
 * Cliente dentro de una transacción. Los servicios reciben este tipo para que
 * sea imposible escribir una entidad fuera de la transacción que la audita
 * (RN-91: si falla la auditoría, falla la operación).
 */
export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

export type Db = PrismaClient | PrismaTransaction
