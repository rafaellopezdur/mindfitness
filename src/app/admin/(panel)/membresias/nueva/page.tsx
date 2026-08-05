import type { Metadata } from 'next'
import { requirePermission } from '@/server/auth/context'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { prisma } from '@/server/infra/prisma'
import { describePlan, sellablePlans } from '@/server/modules/plans/plan-service'
import { businessToday } from '@/server/domain/dates'
import { fullName } from '@/server/domain/clients'
import { PageHeader } from '@/components/patterns/page-header'
import { EmptyState } from '@/components/patterns/empty-state'
import { initials } from '@/lib/cn'
import { MembershipForm } from './membership-form'

export const metadata: Metadata = { title: 'Nueva membresía' }

export default async function NewMembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>
}) {
  await requirePermission(PERMISSIONS.MEMBERSHIP_CREATE, '/admin/membresias/nueva')
  const { cliente } = await searchParams

  // Tres consultas en paralelo: una sola ida y vuelta (ADR-0006).
  // `Membership` se relaciona con el cliente solo por `clientId`, sin relación
  // inversa en `Client`, así que las membresías vivas se consultan aparte.
  const [clients, plans, membresiasVivas] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null, mergedIntoId: null },
      select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true },
      orderBy: { firstName: 'asc' },
      take: 300,
    }),
    sellablePlans(),
    prisma.membership.findMany({
      where: { status: { in: ['PENDING', 'ACTIVE', 'PAUSED'] } },
      select: { clientId: true },
    }),
  ])

  const conMembresia = new Set(membresiasVivas.map((membership) => membership.clientId))

  if (plans.length === 0) {
    return (
      <>
        <PageHeader back={{ href: '/admin/membresias', label: 'Membresías' }} title="Nueva membresía" />
        <EmptyState
          title="Primero hace falta un plan"
          description="Una membresía es la aplicación de un plan a una persona. Crea o activa al menos un plan antes de continuar."
        />
      </>
    )
  }

  if (clients.length === 0) {
    return (
      <>
        <PageHeader back={{ href: '/admin/membresias', label: 'Membresías' }} title="Nueva membresía" />
        <EmptyState
          title="Primero hace falta un cliente"
          description="Registra a la persona antes de venderle un plan. Con nombre, documento y teléfono basta."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        back={{ href: '/admin/membresias', label: 'Membresías' }}
        title="Nueva membresía"
        description="Al crearla se congelan el precio y las condiciones del plan."
      />

      <div className="max-w-2xl">
        <MembershipForm
          today={businessToday()}
          preselectedClientId={cliente}
          clients={clients.map((client) => ({
            id: client.id,
            name: fullName(client),
            document: `${client.documentType} ${client.documentNumber}`,
            initials: initials(fullName(client)),
            hasActiveMembership: conMembresia.has(client.id),
          }))}
          plans={plans.map((plan) => ({
            id: plan.id,
            name: plan.name,
            price: plan.effectivePrice,
            summary: describePlan(plan),
            services: plan.entitlements.map((entitlement) =>
              entitlement.quantity === null
                ? entitlement.serviceName
                : `${entitlement.serviceName} · ${entitlement.quantity} ${
                    { TOTAL: 'en total', DAY: 'al día', WEEK: 'por semana', MONTH: 'al mes' }[entitlement.period]
                  }`,
            ),
          }))}
        />
      </div>
    </>
  )
}
