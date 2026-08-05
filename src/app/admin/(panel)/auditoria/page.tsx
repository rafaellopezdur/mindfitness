import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/server/auth/context'
import { prisma } from '@/server/infra/prisma'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { PageHeader } from '@/components/patterns/page-header'
import { EmptyState } from '@/components/patterns/empty-state'
import { formatDateTime } from '@/lib/cn'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Auditoría' }

const PAGE_SIZE = 25

const SEVERITY_STYLES: Record<string, string> = {
  INFO: 'bg-info-surface text-info',
  NOTICE: 'bg-brand-100 text-brand-800',
  WARNING: 'bg-warn-surface text-warn',
  CRITICAL: 'bg-risk-surface text-risk',
}

/** Traduce el código técnico a algo que una propietaria entienda sin manual. */
const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Inició sesión',
  'auth.logout': 'Cerró sesión',
  'auth.locked': 'Cuenta bloqueada por intentos fallidos',
  'auth.password_changed': 'Cambió su contraseña',
  'user.create': 'Creó un usuario',
  'user.activate': 'Reactivó un usuario',
  'user.deactivate': 'Desactivó un usuario',
  'user.password_reset': 'Restableció una contraseña',
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; accion?: string }>
}) {
  await requirePermission(PERMISSIONS.AUDIT_READ, '/admin/auditoria')
  const { pagina, accion } = await searchParams

  const page = Math.max(1, Number(pagina) || 1)
  const where = accion ? { action: accion } : {}

  const [entries, total, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ['action'], _count: { action: true }, orderBy: { action: 'asc' } }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Bitácora inmutable de las acciones sensibles. No se puede editar ni borrar."
      />

      {actions.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <FilterChip href="/admin/auditoria" active={!accion} label={`Todas (${total})`} />
          {actions.map((a) => (
            <FilterChip
              key={a.action}
              href={`/admin/auditoria?accion=${encodeURIComponent(a.action)}`}
              active={accion === a.action}
              label={`${ACTION_LABELS[a.action] ?? a.action} (${a._count.action})`}
            />
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState
          title="Sin registros todavía"
          description="Aquí aparecerá cada acción sensible: quién la hizo, cuándo, desde dónde y qué cambió exactamente."
        />
      ) : (
        <ol className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {entry.actorEmail ?? 'Sistema'}
                    {entry.actorRole ? ` · ${entry.actorRole}` : ''}
                    {entry.ip ? ` · ${entry.ip}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      SEVERITY_STYLES[entry.severity] ?? SEVERITY_STYLES.INFO,
                    )}
                  >
                    {entry.severity}
                  </span>
                  <time
                    dateTime={entry.createdAt.toISOString()}
                    className="text-xs text-ink-soft"
                  >
                    {formatDateTime(entry.createdAt)}
                  </time>
                </div>
              </div>

              {entry.reason && (
                <p className="mt-2 text-xs text-ink-soft">
                  <span className="font-medium">Motivo:</span> {entry.reason}
                </p>
              )}

              {(entry.before || entry.after) && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-brand-700">
                    Ver qué cambió
                  </summary>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Diff title="Antes" value={entry.before} />
                    <Diff title="Después" value={entry.after} />
                  </div>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}

      {totalPages > 1 && (
        <nav aria-label="Paginación" className="mt-6 flex items-center justify-between text-sm">
          <PageLink
            href={`/admin/auditoria?pagina=${page - 1}${accion ? `&accion=${accion}` : ''}`}
            disabled={page <= 1}
          >
            Anterior
          </PageLink>
          <span className="text-xs text-ink-soft">
            Página {page} de {totalPages}
          </span>
          <PageLink
            href={`/admin/auditoria?pagina=${page + 1}${accion ? `&accion=${accion}` : ''}`}
            disabled={page >= totalPages}
          >
            Siguiente
          </PageLink>
        </nav>
      )}
    </>
  )
}

function Diff({ title, value }: { title: string; value: unknown }) {
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return null
  return (
    <div className="rounded-lg bg-sunken p-2.5">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
        {title}
      </p>
      <pre className="overflow-x-auto text-xs text-ink">{JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href as Route}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-brand-500 bg-brand-50 font-medium text-brand-700'
          : 'border-line-strong text-ink-soft hover:bg-sunken',
      )}
    >
      {label}
    </Link>
  )
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return <span className="text-xs text-ink-faint">{children}</span>
  }
  return (
    <Link href={href as Route} className="text-xs font-medium text-brand-700 hover:underline">
      {children}
    </Link>
  )
}
