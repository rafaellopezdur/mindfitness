import type { Metadata } from 'next'
import { requirePermission } from '@/server/auth/context'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { listServices } from '@/server/modules/plans/plan-service'
import { PageHeader } from '@/components/patterns/page-header'
import { PlanForm } from '../plan-form'

export const metadata: Metadata = { title: 'Nuevo plan' }

export default async function NewPlanPage() {
  await requirePermission(PERMISSIONS.PLAN_CREATE, '/admin/planes/nuevo')
  const services = await listServices()

  return (
    <>
      <PageHeader
        back={{ href: '/admin/planes', label: 'Planes' }}
        title="Nuevo plan"
        description="No elijas un tipo: define las reglas y el tipo emerge de ellas."
      />
      <div className="max-w-3xl">
        <PlanForm services={services} />
      </div>
    </>
  )
}
