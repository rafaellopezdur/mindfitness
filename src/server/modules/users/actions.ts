'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/server/infra/prisma'
import { requirePermission } from '@/server/auth/context'
import { generateTemporaryPassword, hashPassword } from '@/server/auth/password'
import { record } from '@/server/audit/audit-service'
import { revokeAllSessions } from '@/server/auth/session'
import { canModifyUserRoles } from '@/server/auth/rbac'
import { PERMISSIONS, ROLE_CODES } from '@/shared/constants/permissions'
import { createUserSchema } from '@/shared/schemas/auth'

export interface UserFormState {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string>
  /** Contraseña temporal. Se muestra UNA vez y no se vuelve a poder consultar. */
  temporaryPassword?: string
  createdName?: string
}

export async function createUserAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requirePermission(PERMISSIONS.USER_CREATE)

  const parsed = createUserSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    roleCode: formData.get('roleCode'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, fieldErrors }
  }

  const { fullName, email, phone, roleCode } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { ok: false, fieldErrors: { email: 'Ya existe un usuario con ese correo' } }
  }

  const role = await prisma.role.findUnique({ where: { code: roleCode } })
  if (!role) return { ok: false, message: 'Ese rol ya no existe.' }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName,
        email,
        phone: phone || null,
        passwordHash,
        mustChangePassword: true,
        roles: { create: { roleId: role.id, grantedBy: actor.userId } },
      },
    })

    await record(tx, {
      actor,
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      after: { fullName, email, role: roleCode },
      severity: 'NOTICE',
    })
  })

  revalidatePath('/admin/usuarios')

  return {
    ok: true,
    temporaryPassword,
    createdName: fullName,
    message: `${fullName} ya puede entrar con su contraseña temporal.`,
  }
}

export async function toggleUserActiveAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.USER_DEACTIVATE)
  const userId = String(formData.get('userId'))
  const reason = String(formData.get('reason') ?? '').trim()

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  })

  // Nadie se desactiva a sí mismo: evita quedarse fuera del sistema.
  if (user.id === actor.userId) throw new Error('No puedes desactivar tu propia cuenta.')

  const isOwner = user.roles.some((r) => r.role.code === ROLE_CODES.OWNER)
  if (isOwner && user.isActive) {
    // RN-94 · siempre debe quedar al menos una propietaria activa.
    const activeOwners = await prisma.user.count({
      where: {
        isActive: true,
        deletedAt: null,
        roles: { some: { role: { code: ROLE_CODES.OWNER } } },
      },
    })
    if (activeOwners <= 1) {
      throw new Error('No se puede desactivar a la última propietaria activa.')
    }
  }

  const nextActive = !user.isActive

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive: nextActive } })
    await record(tx, {
      actor,
      action: nextActive ? 'user.activate' : 'user.deactivate',
      entityType: 'user',
      entityId: userId,
      before: { isActive: user.isActive },
      after: { isActive: nextActive },
      reason: reason || null,
      severity: 'WARNING',
    })
  })

  // Desactivar debe cortar el acceso ya, no cuando caduque su sesión.
  if (!nextActive) await revokeAllSessions(userId)

  revalidatePath('/admin/usuarios')
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.USER_UPDATE)
  const userId = String(formData.get('userId'))

  if (!canModifyUserRoles(actor, userId) && actor.userId === userId) {
    throw new Error('Cambia tu propia contraseña desde tu perfil.')
  }

  const temporaryPassword = generateTemporaryPassword()

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(temporaryPassword),
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    })
    await record(tx, {
      actor,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: userId,
      severity: 'WARNING',
    })
  })

  await revokeAllSessions(userId)
  revalidatePath('/admin/usuarios')
}
