'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILTROS · un solo patrón para toda la plataforma
 *
 *   🔍 Buscar…                        [Estado ▾]  [Filtros · 2]
 *   Activos ×    Instagram ×    Limpiar todo
 *
 * Decisiones:
 * · El estado vive en la URL. Se comparte, se recarga, el botón atrás funciona
 *   y no hay un segundo estado que mantener sincronizado.
 * · La búsqueda se envía sola tras 300 ms. Nada de botón «aplicar».
 * · Los filtros avanzados abren un popover en escritorio y una hoja inferior
 *   en móvil, donde el pulgar llega.
 * · Al recargar, la lista se atenúa en vez de vaciarse: sin salto ni parpadeo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface QuickFilter {
  /** Clave en la URL. */
  param: string
  label: string
  options: { value: string; label: string }[]
}

export interface ActiveFilter {
  param: string
  value: string
  label: string
}

export function FilterBar({
  searchPlaceholder = 'Buscar…',
  quickFilters = [],
  advanced,
  resultCount,
  className,
}: {
  searchPlaceholder?: string
  quickFilters?: QuickFilter[]
  /** Contenido del panel de filtros avanzados. */
  advanced?: React.ReactNode
  resultCount?: number
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [term, setTerm] = useState(params.get('q') ?? '')
  const firstRender = useRef(true)

  // Búsqueda diferida: se escribe sin que la lista salte en cada tecla.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const timer = setTimeout(() => apply({ q: term || null, pagina: null }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term])

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    const query = next.toString()
    startTransition(() => {
      router.replace((query ? `${pathname}?${query}` : pathname) as Route, { scroll: false })
    })
  }

  // Filtros aplicados, para mostrarlos como etiquetas removibles.
  const active: ActiveFilter[] = []
  for (const filter of quickFilters) {
    const value = params.get(filter.param)
    if (!value) continue
    const option = filter.options.find((o) => o.value === value)
    active.push({ param: filter.param, value, label: option?.label ?? value })
  }

  const activeCount = active.length
  const hasAnything = activeCount > 0 || Boolean(params.get('q'))

  return (
    <div className={cn('mb-5 space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={cn(
              'h-11 w-full rounded-md border border-line-strong bg-surface pl-9 pr-9 text-sm text-ink',
              'transition-[border-color] duration-150 placeholder:text-ink-faint',
              'hover:border-line-strong focus:border-brand-500',
            )}
          />
          {pending && (
            <Loader2
              className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-faint"
              aria-hidden
            />
          )}
        </div>

        {/* Filtros rápidos: los del 90 % de los casos, siempre a la vista. */}
        {quickFilters.slice(0, 2).map((filter) => (
          <QuickSelect
            key={filter.param}
            filter={filter}
            value={params.get(filter.param) ?? ''}
            onChange={(value) => apply({ [filter.param]: value || null, pagina: null })}
          />
        ))}

        {advanced && (
          <Button variant="secondary" onClick={() => setAdvancedOpen(true)} className="gap-1.5">
            <SlidersHorizontal className="size-4" aria-hidden />
            Filtros
            {activeCount > 0 && (
              <span className="ml-0.5 grid size-5 place-items-center rounded-full bg-brand-500 text-2xs font-semibold text-white">
                {activeCount}
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Etiquetas removibles: se quita una sin perder las demás. */}
      {hasAnything && (
        <div className="animate-fade flex flex-wrap items-center gap-1.5">
          {active.map((filter) => (
            <button
              key={`${filter.param}-${filter.value}`}
              type="button"
              onClick={() => apply({ [filter.param]: null, pagina: null })}
              className={cn(
                'press inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50',
                'py-1 pl-2.5 pr-1.5 text-xs font-medium text-brand-700',
                'transition-colors duration-150 hover:bg-brand-100',
              )}
            >
              {filter.label}
              <X className="size-3" aria-hidden />
              <span className="sr-only">Quitar filtro</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setTerm('')
              const cleared: Record<string, string | null> = { q: null, pagina: null }
              for (const filter of quickFilters) cleared[filter.param] = null
              apply(cleared)
            }}
            className="rounded-full px-2 py-1 text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline"
          >
            Limpiar todo
          </button>

          {resultCount !== undefined && (
            <span className="ml-auto text-xs text-ink-soft">
              {resultCount === 1 ? '1 resultado' : `${resultCount} resultados`}
            </span>
          )}
        </div>
      )}

      {advanced && (
        <Sheet
          open={advancedOpen}
          onClose={() => setAdvancedOpen(false)}
          title="Filtros"
          description="Se aplican al instante."
          footer={
            <>
              <Button variant="secondary" onClick={() => setAdvancedOpen(false)}>
                Cerrar
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const cleared: Record<string, string | null> = { q: null, pagina: null }
                  for (const filter of quickFilters) cleared[filter.param] = null
                  setTerm('')
                  apply(cleared)
                }}
              >
                Limpiar todo
              </Button>
            </>
          }
        >
          {advanced}
        </Sheet>
      )}
    </div>
  )
}

/** Selector compacto en línea. Nativo por dentro, con aspecto del sistema. */
function QuickSelect({
  filter,
  value,
  onChange,
}: {
  filter: QuickFilter
  value: string
  onChange: (value: string) => void
}) {
  const isActive = Boolean(value)
  return (
    <label className="relative">
      <span className="sr-only">{filter.label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-11 cursor-pointer appearance-none rounded-md border pl-3 pr-8 text-sm',
          'transition-colors duration-150',
          isActive
            ? 'border-brand-300 bg-brand-50 font-medium text-brand-700'
            : 'border-line-strong bg-surface text-ink',
        )}
      >
        <option value="">{filter.label}</option>
        {filter.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className={cn(
          'pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2',
          isActive ? 'text-brand-600' : 'text-ink-faint',
        )}
      >
        <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </label>
  )
}
