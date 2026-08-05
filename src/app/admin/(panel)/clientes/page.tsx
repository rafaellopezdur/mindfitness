import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { Search, UserPlus } from 'lucide-react'
import { requirePermission } from '@/server/auth/context'
import { can } from '@/server/auth/rbac'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { searchClients } from '@/server/modules/clients/client-service'
import { getAcquisitionChannels } from '@/server/modules/settings/settings-service'
import { deriveClientStatus, formatPhone, fullName } from '@/server/domain/clients'
import { PageHeader } from '@/components/patterns/page-header'
import { EmptyState } from '@/components/patterns/empty-state'
import { StatusBadge } from '@/components/patterns/status-badge'
import { Button } from '@/components/ui/button'
import { cn, initials } from '@/lib/cn'

export const metadata: Metadata = { title: 'Clientes' }

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

  return (
    <>
      <PageHeader
        title="Clientes"
        description={total === 1 ? '1 cliente registrado' : `${total} clientes registrados`}
        actions={
          canCreate && (
            <Link href="/admin/clientes/nuevo">
              <Button>
                <UserPlus className="size-4" aria-hidden />
                Nuevo cliente
              </Button>
            </Link>
          )
        }
      />

      {/* La búsqueda es un formulario GET: el resultado queda en la URL y se
          puede compartir, recargar y volver atrás sin perderlo. */}
      <form method="get" className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[--color-text-subtle]"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar por documento, nombre o teléfono…"
            aria-label="Buscar clientes"
            className="min-h-11 w-full rounded-lg border border-[--color-border-strong] bg-[--color-surface-raised] pl-9 pr-3 text-sm text-[--color-text] placeholder:text-[--color-text-subtle]"
          />
        </div>
        {canal !== undefined && <input type="hidden" name="canal" value={canal} />}
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip href="/admin/clientes" active={!hasFilters} label="Todos" />
        <FilterChip href="/admin/clientes?estado=BLOCKED" active={estado === 'BLOCKED'} label="Bloqueados" />
        {channels.slice(0, 4).map((channel) => (
          <FilterChip
            key={channel}
            href={`/admin/clientes?canal=${encodeURIComponent(channel)}`}
            active={canal === channel}
            label={channel}
          />
        ))}
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Ningún cliente coincide' : 'Todavía no hay clientes'}
          description={
            hasFilters
              ? 'Prueba con el número de documento completo, o quita los filtros.'
              : 'Registra al primero. Con nombre, documento y teléfono es suficiente para empezar.'
          }
          action={
            hasFilters ? (
              <Link href="/admin/clientes">
                <Button variant="secondary">Quitar filtros</Button>
              </Link>
            ) : (
              canCreate && (
                <Link href="/admin/clientes/nuevo">
                  <Button>Registrar cliente</Button>
                </Link>
              )
            )
          }
        />
      ) : (
        <>
          {/* Móvil: tarjetas. Escritorio: tabla. Mismos datos, una sola fuente. */}
          <ul className="space-y-2 lg:hidden">
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/admin/clientes/${client.id}` as Route}
                  className="flex items-center gap-3 rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-4 active:bg-[--color-surface-sunken]"
                >
                  <span
                    aria-hidden
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800"
                  >
                    {initials(fullName(client))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[--color-text]">
                      {fullName(client)}
                    </span>
                    <span className="block truncate text-xs text-[--color-text-muted]">
                      {client.documentType} {client.documentNumber} · {formatPhone(client.phone)}
                    </span>
                  </span>
                  <StatusBadge status={deriveClientStatus({ statusOverride: client.statusOverride })} />
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-[--color-border] bg-[--color-surface-raised] lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-[--color-border] bg-[--color-surface-sunken]">
                <tr className="text-left text-xs uppercase tracking-wide text-[--color-text-muted]">
                  <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                  <th scope="col" className="px-4 py-3 font-medium">Documento</th>
                  <th scope="col" className="px-4 py-3 font-medium">Teléfono</th>
                  <th scope="col" className="px-4 py-3 font-medium">Canal</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-sunken]"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/clientes/${client.id}` as Route} className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800"
                        >
                          {initials(fullName(client))}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[--color-text]">
                            {fullName(client)}
                          </span>
                          <span className="block truncate text-xs text-[--color-text-muted]">{client.code}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="tabular px-4 py-3 text-[--color-text-muted]">
                      {client.documentType} {client.documentNumber}
                    </td>
                    <td className="tabular px-4 py-3 text-[--color-text-muted]">{formatPhone(client.phone)}</td>
                    <td className="px-4 py-3 text-xs text-[--color-text-muted]">
                      {client.acquisitionChannel ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={deriveClientStatus({ statusOverride: client.statusOverride })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav aria-label="Paginación" className="mt-5 flex items-center justify-between text-xs">
              <PageLink href={buildUrl({ q, estado, canal, pagina: page - 1 })} disabled={page <= 1}>
                Anterior
              </PageLink>
              <span className="text-[--color-text-muted]">
                Página {page} de {totalPages}
              </span>
              <PageLink href={buildUrl({ q, estado, canal, pagina: page + 1 })} disabled={page >= totalPages}>
                Siguiente
              </PageLink>
            </nav>
          )}
        </>
      )}
    </>
  )
}

function buildUrl(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `/admin/clientes?${query}` : '/admin/clientes'
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href as Route}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-brand-500 bg-brand-50 font-medium text-brand-700'
          : 'border-[--color-border-strong] text-[--color-text-muted] hover:bg-[--color-surface-sunken]',
      )}
    >
      {label}
    </Link>
  )
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) return <span className="text-[--color-text-subtle]">{children}</span>
  return (
    <Link href={href as Route} className="font-medium text-brand-700 hover:underline">
      {children}
    </Link>
  )
}
