import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { CreditCard, Plus } from 'lucide-react'
import { requirePermission } from '@/server/auth/context'
import { can } from '@/server/auth/rbac'
import { PERMISSIONS } from '@/shared/constants/permissions'
import {
  listMemberships,
  MEMBERSHIP_STATE_LABELS,
  type DerivedMembershipState,
} from '@/server/modules/memberships/membership-service'
import { formatLong } from '@/server/domain/dates'
import { PageHeader } from '@/components/patterns/page-header'
import { EmptyState } from '@/components/patterns/empty-state'
import { DataView, type Column } from '@/components/patterns/data-view'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { buttonClass } from '@/components/ui/button'
import { cn, formatMoney, initials } from '@/lib/cn'

export const metadata: Metadata = { title: 'Membresías' }

const STATE_TONE: Record<DerivedMembershipState, BadgeTone> = {
  PENDING: 'warn',
  ACTIVE: 'ok',
  EXPIRING_SOON: 'warn',
  IN_GRACE: 'warn',
  EXPIRED: 'risk',
  PAUSED: 'mute',
  COMPLETED: 'mute',
  CANCELLED: 'mute',
  SUPERSEDED: 'mute',
}

const FILTERS = [
  { key: '', label: 'Todas' },
  { key: 'ACTIVAS', label: 'Activas' },
  { key: 'PENDIENTES', label: 'Pendientes' },
  { key: 'VENCIDAS', label: 'Vencidas' },
  { key: 'PAUSADAS', label: 'Pausadas' },
]

type Row = Awaited<ReturnType<typeof listMemberships>>[number]

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const actor = await requirePermission(PERMISSIONS.MEMBERSHIP_READ, '/admin/membresias')
  const { estado } = await searchParams

  const memberships = await listMemberships({ estado })
  const canCreate = can(actor, PERMISSIONS.MEMBERSHIP_CREATE)

  const columns: Column<Row>[] = [
    {
      key: 'client',
      header: 'Cliente',
      role: 'title',
      cell: (membership) => (
        <>
          <span className="block truncate font-medium text-ink">{membership.clientName}</span>
          <span className="tabular block truncate text-xs text-ink-faint">{membership.clientDocument}</span>
        </>
      ),
    },
    { key: 'plan', header: 'Plan', role: 'subtitle', cell: (membership) => membership.planName },
    {
      key: 'vigencia',
      header: 'Vigencia',
      role: 'meta',
      cell: (membership) =>
        membership.endDate ? (
          <span className="tabular">Vence {formatLong(membership.endDate)}</span>
        ) : membership.sessionsIncluded ? (
          <span className="tabular">
            {membership.sessionsUsed} de {membership.sessionsIncluded} sesiones
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'precio',
      header: 'Precio',
      role: 'hidden',
      align: 'right',
      cell: (membership) => <span className="tabular">{formatMoney(membership.finalPrice)}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      role: 'status',
      cell: (membership) => (
        <Badge tone={STATE_TONE[membership.state]}>{MEMBERSHIP_STATE_LABELS[membership.state]}</Badge>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Membresías"
        description="El contrato de cada persona. Sus condiciones quedan congeladas al venderse."
        actions={
          canCreate && (
            <Link href="/admin/membresias/nueva" className={buttonClass()}>
              <Plus className="size-4" aria-hidden />
              Nueva membresía
            </Link>
          )
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = (estado ?? '') === filter.key
          return (
            <Link
              key={filter.key || 'todas'}
              href={(filter.key ? `/admin/membresias?estado=${filter.key}` : '/admin/membresias') as Route}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors duration-150',
                active
                  ? 'border-brand-500 bg-brand-50 font-medium text-brand-700'
                  : 'border-line-strong text-ink-soft hover:bg-sunken',
              )}
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      <DataView
        rows={memberships}
        columns={columns}
        rowKey={(membership) => membership.id}
        href={(membership) => `/admin/membresias/${membership.id}`}
        avatar={(membership) => (
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800"
          >
            {initials(membership.clientName)}
          </span>
        )}
        empty={
          <EmptyState
            icon={CreditCard}
            title={estado ? 'Ninguna membresía en ese estado' : 'Todavía no hay membresías'}
            description={
              estado
                ? 'Prueba con otro filtro.'
                : 'Una membresía es la aplicación de un plan a una persona. Crea la primera desde aquí o desde la ficha del cliente.'
            }
            action={
              canCreate &&
              !estado && (
                <Link href="/admin/membresias/nueva" className={buttonClass()}>
                  Crear membresía
                </Link>
              )
            }
          />
        }
      />
    </>
  )
}
