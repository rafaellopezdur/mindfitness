/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEED · datos iniciales
 *
 * Idempotente: se puede ejecutar tantas veces como haga falta.
 *   npm run db:seed
 *
 * Siembra:
 *   · los permisos del catálogo (constantes de código)
 *   · los 4 roles con sus permisos según la matriz
 *   · el usuario OWNER inicial, con contraseña temporal de un solo uso
 *   · la configuración del negocio y las reglas confirmadas
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { PrismaClient, type SettingGroup, type SettingType } from '@prisma/client'
import { ALL_PERMISSIONS, permissionModule, ROLE_SEED, type Permission } from '../src/shared/constants/permissions'
import { BUSINESS, PAYMENT_METHODS, PLANS, RULES, SERVICES } from '../src/config/placeholders'
import { generateTemporaryPassword, hashPassword } from '../src/server/auth/password'

const prisma = new PrismaClient()

async function seedPermissions() {
  for (const code of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: { module: permissionModule(code) },
      create: { code, module: permissionModule(code) },
    })
  }
  console.log(`  ✓ ${ALL_PERMISSIONS.length} permisos`)
}

async function seedRoles() {
  const allPermissions = await prisma.permission.findMany()
  const byCode = new Map(allPermissions.map((p) => [p.code, p.id]))

  for (const [code, seed] of Object.entries(ROLE_SEED)) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name: seed.name, description: seed.description },
      create: { code, name: seed.name, description: seed.description, isSystem: true },
    })

    const granted: Permission[] = seed.permissions === 'ALL' ? ALL_PERMISSIONS : [...seed.permissions]

    // Se reemplaza el conjunto completo: el seed es la fuente de verdad inicial.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    await prisma.rolePermission.createMany({
      data: granted
        .map((p) => byCode.get(p))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    })

    console.log(`  ✓ rol ${code.padEnd(11)} → ${granted.length} permisos`)
  }
}

async function seedOwner() {
  const email = process.env.SEED_OWNER_EMAIL ?? 'admin@mindfitnessclub.com.co'
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    console.log(`  · usuario ${email} ya existe, no se modifica`)
    return
  }

  const temporaryPassword = process.env.SEED_OWNER_PASSWORD ?? generateTemporaryPassword()
  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { code: 'OWNER' } })

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(temporaryPassword),
      fullName: 'Administradora',
      // Obliga a cambiarla en el primer ingreso (RN de seguridad).
      mustChangePassword: true,
      roles: { create: { roleId: ownerRole.id } },
    },
  })

  console.log(`
  ┌──────────────────────────────────────────────────────┐
  │  USUARIO INICIAL CREADO                              │
  │  Correo:     ${email.padEnd(40)}│
  │  Contraseña: ${temporaryPassword.padEnd(40)}│
  │                                                      │
  │  ⚠️  Es temporal: se pedirá cambiarla al entrar.      │
  │      No se volverá a mostrar.                        │
  └──────────────────────────────────────────────────────┘
  `)
  return user
}

type SettingSeed = { key: string; group: SettingGroup; type: SettingType; value: unknown; description?: string }

async function seedSettings() {
  const settings: SettingSeed[] = [
    // ── Negocio ──────────────────────────────────────────────────────────
    { key: 'business.name', group: 'business', type: 'string', value: BUSINESS.name },
    { key: 'business.legal_name', group: 'business', type: 'string', value: BUSINESS.legalName },
    { key: 'business.tax_id', group: 'business', type: 'string', value: BUSINESS.taxId },
    { key: 'business.address', group: 'business', type: 'string', value: BUSINESS.address },
    { key: 'business.city', group: 'business', type: 'string', value: BUSINESS.city },
    { key: 'business.phone', group: 'business', type: 'string', value: BUSINESS.phone },
    { key: 'business.whatsapp', group: 'business', type: 'string', value: BUSINESS.whatsapp },
    { key: 'business.email', group: 'business', type: 'string', value: BUSINESS.email },
    { key: 'business.timezone', group: 'business', type: 'string', value: BUSINESS.timezone },
    { key: 'business.social', group: 'business', type: 'json', value: BUSINESS.social },

    // ── Reglas confirmadas (docs/15-catalogo-planes.md §7) ───────────────
    {
      key: 'rules.month_mode',
      group: 'rules',
      type: 'string',
      value: RULES.monthMode,
      description: 'P38 · CALENDAR: 15 ago vence 14 sep',
    },
    {
      key: 'rules.week_starts_on',
      group: 'rules',
      type: 'string',
      value: RULES.weekStartsOn,
      description: 'P31 · semana del límite de visitas',
    },
    {
      key: 'rules.weekly_limit_enforcement',
      group: 'rules',
      type: 'string',
      value: RULES.weeklyLimitEnforcement,
      description: 'P30 · WARN: se avisa y se registra, no se bloquea',
    },
    {
      key: 'rules.entitlement_rollover',
      group: 'rules',
      type: 'boolean',
      value: RULES.entitlementRollover,
      description: 'P32 · los días no usados no se acumulan',
    },
    {
      key: 'rules.authorization_mode',
      group: 'rules',
      type: 'string',
      value: RULES.authorizationMode,
      description: 'P28 · OPERATIONAL: se presta y se aprueba después',
    },
    { key: 'rules.expiring_soon_days', group: 'rules', type: 'number', value: RULES.expiringSoonDays },
    { key: 'rules.default_grace_days', group: 'rules', type: 'number', value: RULES.defaultGraceDays },
    { key: 'rules.inactive_after_days', group: 'rules', type: 'number', value: RULES.inactiveAfterDays },
    { key: 'rules.registration_expires_hours', group: 'rules', type: 'number', value: RULES.registrationExpiresHours },
    { key: 'rules.slot_hold_minutes', group: 'rules', type: 'number', value: RULES.slotHoldMinutes },
    { key: 'rules.waitlist_offer_hours', group: 'rules', type: 'number', value: RULES.waitlistOfferHours },
    {
      key: 'rules.allow_multiple_active_memberships',
      group: 'rules',
      type: 'boolean',
      value: RULES.allowMultipleActiveMemberships,
    },
    { key: 'rules.schedule_tolerance_minutes', group: 'rules', type: 'number', value: RULES.scheduleToleranceMinutes },

    // ── Pagos ────────────────────────────────────────────────────────────
    { key: 'payments.currency', group: 'payments', type: 'string', value: BUSINESS.currency },
    { key: 'payments.enrollment_fee', group: 'payments', type: 'money', value: RULES.enrollmentFee },
    { key: 'payments.max_discount_percent_front_desk', group: 'payments', type: 'number', value: 0 },
    { key: 'payments.online_enabled', group: 'payments', type: 'boolean', value: false },
    { key: 'payments.onsite_enabled', group: 'payments', type: 'boolean', value: true },
    { key: 'payments.methods', group: 'payments', type: 'json', value: PAYMENT_METHODS },

    // ── Marca ────────────────────────────────────────────────────────────
    { key: 'branding.color.primary', group: 'branding', type: 'string', value: '#C08551' },
    { key: 'branding.color.accent', group: 'branding', type: 'string', value: '#F5BC6D' },
    { key: 'branding.color.ink', group: 'branding', type: 'string', value: '#111111' },

    // ── Catálogo confirmado (se materializa en tablas en la Fase 3) ──────
    {
      key: 'catalog.services',
      group: 'rules',
      type: 'json',
      value: SERVICES,
      description: 'Catálogo de servicios · docs/15-catalogo-planes.md §3',
    },
    {
      key: 'catalog.plans',
      group: 'rules',
      type: 'json',
      value: PLANS,
      description: 'Planes reales confirmados el 4 ago 2026 · docs/15-catalogo-planes.md',
    },

    // ── Legales (pendientes de redacción — P6) ──────────────────────────
    { key: 'legal.terms_version', group: 'legal', type: 'string', value: 'v0-borrador' },
    { key: 'legal.privacy_version', group: 'legal', type: 'string', value: 'v0-borrador' },
    { key: 'legal.data_processing_version', group: 'legal', type: 'string', value: 'v0-borrador' },
  ]

  for (const setting of settings) {
    await prisma.businessSetting.upsert({
      where: { key: setting.key },
      // No se pisan valores ya editados desde el portal administrativo:
      // solo se completa la descripción.
      update: { description: setting.description ?? null },
      create: {
        key: setting.key,
        group: setting.group,
        type: setting.type,
        value: setting.value as never,
        description: setting.description ?? null,
      },
    })
  }
  console.log(`  ✓ ${settings.length} claves de configuración`)
}

async function main() {
  console.log('\n🌱 Sembrando Mind Fitness Club…\n')
  await seedPermissions()
  await seedRoles()
  await seedSettings()
  await seedOwner()
  console.log('✅ Listo.\n')
}

main()
  .catch((error) => {
    console.error('❌ Falló el seed:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
