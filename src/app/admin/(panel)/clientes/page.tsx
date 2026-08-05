import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchX, UserPlus, Users } from 'lucide-react'
import { requirePermission } from '@/server/auth/context'
import { can } from '@/server/auth/rbac'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { searchClients } from '@/server/modules/clients/client-service'
import { getAcquisitionChannels } from '@/server/modules/settings/settings-service'
import { deriveClientStatus, formatPhone, fullName } from '@/server/domain/clients'
import { PageHeader } from '@/components/patterns/page-header'
import { EmptyState } from '@/components/patterns/empty-state'
import { StatusBadge } from '@/components/patterns/status-badge'
import { FilterBar } from '@/components/patterns/filter-bar'
import { DataView, Pagination, type Column } from '@/components/patterns/data-view'
import { buttonClass } from '@/components/ui/button'
import { initials } from '@/lib/cn'

export const metadata: Metadata = { title: 'Clientes' }

type Row = Awaited<ReturnType<typeof searchClients>>['clients'][number]

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; canal?: string; pagina?: string }>
}) {
  const actor = await requirePermission(PERMISSIONS.CLIENT_READ, '/admin/clientes')
  const { q, estado, canal, pagina } = await searchParams

  const [{ clients, total, page, totalPages }, channels] = await Promise.all([
    searchClients(actor, { query: q, status: estado, channel: canal, page: Number(pagina) || 1 }),
    getAcquisitionChannels(),
  ])

  const canCreate = can(actor, PERMISSIONS.CLIENT_CREATE)
  const hasFilters = Boolean(q || estado || canal)

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Cliente',
      role: 'title',
      cell: (client) => (
        <>
          <span className="block truncate font-medium text-ink">{fullName(client)}</span>
          <span className="tabular block truncate text-xs text-ink-faint lg:hidden">
            {client.documentType} {client.documentNumber}
          </span>
          <span className="hidden text-xs text-ink-faint lg:block">{client.code}</span>
        </>
      ),
    },
    {
      key: 'document',
      header: 'Documento',
      role: 'subtitle',
      cell: (client) => (
        <span className="tabular">
          <span className="lg:hidden">{formatPhone(client.phone)}</span>
          <span className="hidden lg:inline">
            {client.documentType} {client.documentNumber}
          </span>
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Teléfono',
      role: 'hidden',
      cell: (client) => <span className="tabular">{formatPhone(client.phone)}</span>,
    },
    {
      key: 'channel',
      header: 'Canal',
      role: 'hidden',
      secondary: true,
      cell: (client) => <span className="text-xs">{client.acquisitionChannel ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      role: 'status',
      cell: (client) => <StatusBadge status={deriveClientStatus({ statusOverride: client.statusOverride })} />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Clientes"
        description={total === 1 ? '1 persona registrada' : `${total} personas registradas`}
        actions={
          canCreate && (
            <Link href="/admin/clientes/nuevo" className={buttonClass()}>
              <UserPlus className="size-4" aria-hidden />
              Nuevo cliente
            </Link>
          )
        }
      />

      <FilterBar
        searchPlaceholder="Documento, nombre o teléfono…"
        resultCount={total}
        quickFilters={[
          {
            param: 'estado',
            label: 'Estado',
            options: [
              { value: 'BLOCKED', label: 'Bloqueados' },
              { value: 'INACTIVE', label: 'Inactivos' },
            ],
          },
          {
            param: 'canal',
            label: 'Canal',
            options: channels.map((channel) => ({ value: channel, label: channel })),
          },
        ]}
        advanced={
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">
              Cuando existan membresías y pagos, aquí se filtrará también por plan, vencimiento,
              entrenador y saldo pendiente.
            </p>
            <p className="text-xs text-ink-faint">Llega en las Fases 3 y 4.</p>
          </div>
        }
      />

      <DataView
        rows={clients}
        columns={columns}
        rowKey={(client) => client.id}
        href={(client) => `/admin/clientes/${client.id}`}
        avatar={(client) => (
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800"
          >
            {initials(fullName(client))}
          </span>
        )}
        empty={
          hasFilters ? (
            <EmptyState
              variant="search"
              icon={SearchX}
              title="Ningún cliente coincide"
              description="Prueba con el número de documento completo, o quita los filtros para ver a todos."
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Todavía no hay clientes"
              description="Registra al primero. Con nombre, documento y teléfono es suficiente para empezar; lo demás se completa después."
              action={
                canCreate && (
                  <Link href="/admin/clientes/nuevo" className={buttonClass()}>
                    <UserPlus className="size-4" aria-hidden />
                    Registrar cliente
                  </Link>
                )
              }
            />
          )
        }
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(target) => {
          const search = new URLSearchParams()
          if (q) search.set('q', q)
          if (estado) search.set('estado', estado)
          if (canal) search.set('canal', canal)
          search.set('pagina', String(target))
          return `/admin/clientes?${search}`
        }}
      />
    </>
  )
}
