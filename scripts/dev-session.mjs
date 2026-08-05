/**
 * Crea una sesión válida para un usuario y devuelve el token de la cookie.
 * SOLO para desarrollo: sirve para tomar capturas del panel autenticado sin
 * automatizar el formulario de ingreso.
 *
 *   node --env-file=.env scripts/dev-session.mjs [correo]
 *
 * NO modifica el usuario. En particular, no toca `mustChangePassword`: hacerlo
 * llegó a marcar como temporal una contraseña que la persona ya había cambiado,
 * obligándola a cambiarla otra vez en cada carga.
 */

import { createHash, randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

if (process.env.NODE_ENV === 'production') {
  console.error('Este script no debe ejecutarse en producción.')
  process.exit(1)
}

const email = process.argv[2] ?? 'admin@mindfitnessclub.com.co'
const prisma = new PrismaClient()

const user = await prisma.user.findUnique({ where: { email } })
if (!user) {
  console.error(`No existe el usuario ${email}`)
  process.exit(1)
}

const token = randomBytes(32).toString('base64url')
await prisma.session.create({
  data: {
    userId: user.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    userAgent: 'dev-session-script',
    // 8 horas: por debajo del umbral de renovación (24 h) la sesión entraba en
    // la rama de extensión en cada lectura, que es donde estaba el fallo.
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
  },
})

console.log(token)
await prisma.$disconnect()
