import type { Route } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DATAVIEW · una sola fuente para tabla y tarjetas
 *
 * Antes el listado de Clientes y el de Usuarios tenían el markup escrito DOS
 * veces —una lista para móvil y una tabla para escritorio—, con el riesgo de
 * que se desincronizaran en cada cambio. Aquí las columnas se declaran una vez
 * y cada una dice qué papel juega en la tarjeta móvil:
 *
 *   role: 'title'    → título de la tarjeta
 *   role: 'subtitle' → segunda línea
 *   role: 'meta'     → dato de apoyo bajo el subtítulo
 *   role: 'status'   → distintivo a la derecha
 *   role: 'hidden'   → solo tabla, se omite en móvil
 *
 * Sin desplazamiento horizontal, sin «ábrelo en el computador para ver más».
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type ColumnRole = 'title' | 'subtitle' | 'meta' | 'status' | 'hidden'

export interface Column<T> {
  key: string
  header: string
  role?: ColumnRole
  /** Se oculta en tablet, se conserva en escritorio. */
  secondary?: boolean
  align?: 'left' | 'right'
  cell: (row: T) => React.ReactNode
}

interface DataViewProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  /** Si se indica, toda la fila o tarjeta navega ahí. */
  href?: (row: T) => string
  /** Avatar de la tarjeta móvil y de la primera celda. */
  avatar?: (row: T) => React.ReactNode
  empty: React.ReactNode
  pending?: boolean
  className?: string
}

export function DataView<T>({
  rows,
  columns,
  rowKey,
  href,
  avatar,
  empty,
  pending,
  className,
}: DataViewProps<T>) {
  if (rows.length === 0) return <>{empty}</>

  const byRole = (role: ColumnRole) => columns.find((column) => column.role === role)
  const title = byRole('title')
  const subtitle = byRole('subtitle')
  const meta = byRole('meta')
  const status = byRole('status')

  return (
    <div className={cn(pending && 'is-pending', className)}>
      {/* ── Móvil · tarjetas ─────────────────────────────────────────── */}
      <ul className="stagger space-y-2 lg:hidden">
        {rows.map((row) => {
          const body = (
            <>
              {avatar?.(row)}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{title?.cell(row)}</span>
                {subtitle && (
                  <span className="tabular block truncate text-xs text-ink-soft">{subtitle.cell(row)}</span>
                )}
                {meta && <span className="mt-0.5 block truncate text-xs text-ink-faint">{meta.cell(row)}</span>}
              </span>
              {status?.cell(row)}
              {href && <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />}
            </>
          )

          const shell = cn(
            'flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-flat',
            'transition-[background-color,border-color] duration-150',
            href && 'press active:bg-sunken',
          )

          return (
            <li key={rowKey(row)}>
              {href ? (
                <Link href={href(row) as Route} className={shell}>
                  {body}
                </Link>
              ) : (
                <div className={shell}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>

      {/* ── Escritorio · tabla ───────────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-xl border border-line bg-surface shadow-flat lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line bg-sunken">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'eyebrow px-4 py-2.5 font-semibold',
                    column.align === 'right' ? 'text-right' : 'text-left',
                    column.secondary && 'hidden xl:table-cell',
                  )}
                >
                  {column.header}
                </th>
              ))}
              {href && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="stagger">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  'group border-b border-line last:border-0',
                  'transition-colors duration-150 hover:bg-sunken',
                )}
              >
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-2.5 text-sm text-ink-soft',
                      column.align === 'right' && 'text-right',
                      column.secondary && 'hidden xl:table-cell',
                    )}
                  >
                    {index === 0 && avatar ? (
                      <span className="flex items-center gap-3">
                        {avatar(row)}
                        <span className="min-w-0">{column.cell(row)}</span>
                      </span>
                    ) : (
                      column.cell(row)
                    )}
                  </td>
                ))}
                {href && (
                  <td className="pr-3">
                    <Link
                      href={href(row) as Route}
                      className="grid size-8 place-items-center rounded-md text-ink-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label="Abrir"
                    >
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Paginación discreta. Sin números de página: casi nunca se usan. */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number
  totalPages: number
  buildHref: (page: number) => string
}) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginación" className="mt-5 flex items-center justify-between text-xs">
      <PageLink href={buildHref(page - 1)} disabled={page <= 1}>
        ← Anterior
      </PageLink>
      <span className="tabular text-ink-soft">
        Página {page} de {totalPages}
      </span>
      <PageLink href={buildHref(page + 1)} disabled={page >= totalPages}>
        Siguiente →
      </PageLink>
    </nav>
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
  if (disabled) return <span className="px-2 py-1 text-ink-faint">{children}</span>
  return (
    <Link
      href={href as Route}
      className="rounded-md px-2 py-1 font-medium text-brand-700 transition-colors duration-150 hover:bg-brand-50"
    >
      {children}
    </Link>
  )
}
