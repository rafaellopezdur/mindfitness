import { z } from 'zod'

/**
 * Esquemas compartidos entre el formulario y el servidor.
 * Un único objeto valida las dos orillas: es imposible que se desincronicen.
 */

export const PASSWORD_MIN_LENGTH = 10

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Escribe tu correo')
    .email('Ese correo no parece válido')
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, 'Escribe tu contraseña'),
})

export type LoginInput = z.infer<typeof loginSchema>

const strongPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .refine((v) => /[a-záéíóúñ]/.test(v), 'Debe incluir una letra minúscula')
  .refine((v) => /[A-ZÁÉÍÓÚÑ]/.test(v), 'Debe incluir una letra mayúscula')
  .refine((v) => /[0-9]/.test(v), 'Debe incluir un número')

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Escribe tu contraseña actual'),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, 'Repite la contraseña nueva'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    message: 'La contraseña nueva debe ser distinta de la actual',
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const createUserSchema = z.object({
  fullName: z.string().min(3, 'Escribe el nombre completo').max(120),
  email: z
    .string()
    .email('Ese correo no parece válido')
    .transform((v) => v.trim().toLowerCase()),
  phone: z.string().max(30).optional().or(z.literal('')),
  roleCode: z.enum(['OWNER', 'FRONT_DESK', 'TRAINER'], {
    errorMap: () => ({ message: 'Elige un rol' }),
  }),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
