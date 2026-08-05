import type { Route } from 'next'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MÉTRICAS AGRUPADAS
 *
 * Cuatro tarjetas idénticas dan a todo el mismo peso, y entonces nada destaca.
 * Aquí las cifras relacionadas viven en UN bloque, separadas por una línea:
 * pesa menos visualmente, ocupa menos y se lee de un vistazo.
 *
 * Las cifras van en la tipografía display con `tabular-nums`. Es lo que se lee
 * de lejos, que es como se mira una pantalla en el mostrador.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface Metric {
  label: string
  value: string | number
  /** Nota bajo la cifra: comparación, detalle o unidad. */
  note?: string
  tone?: 'default' | 'ok' | 'warn' | 'risk'
  href?: string
}

const TONE = {
  default: 'text-ink',
  ok: 'text-ok',
  warn: 'text-warn',
  risk: 'text-risk',
} as const

export function MetricGroup({
  title,
  metrics,
  action,
  className,
}: {
  title?: string
  metrics: Metric[]
  action?: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface shadow-flat', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          {title && <h2 className="eyebrow">{title}</h2>}
          {action}
        </header>
      )}

      <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        {metrics.map((metric, index) => {
          const content = (
            <>
              <p className={cn('numeral text-2xl leading-none sm:text-3xl', TONE[metric.tone ?? 'default'])}>
                {metric.value}
              </p>
              <p className="mt-1.5 text-xs font-medium text-ink-soft">{metric.label}</p>
              {metric.note && <p className="mt-0.5 text-2xs text-ink-faint">{metric.note}</p>}
            </>
          )

          const cell = cn(
            'px-5 py-4',
            // La rejilla de 2 columnas en móvil necesita sus propias líneas.
            index % 2 === 0 && 'border-r border-line sm:border-r-0',
            index < metrics.length - 2 && 'border-b border-line sm:border-b-0',
            metric.href && 'transition-colors duration-150 hover:bg-sunken',
          )

          return metric.href ? (
            <Link key={metric.label} href={metric.href as Route} className={cn(cell, 'group block')}>
              {content}
              <span className="mt-1 inline-flex items-center gap-1 text-2xs font-medium text-brand-700 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Ver <ArrowRight className="size-3" aria-hidden />
              </span>
            </Link>
          ) : (
            <div key={metric.label} className={cell}>
              {content}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Alerta accionable.
 * No es una métrica más: es algo que alguien tiene que resolver hoy, y por eso
 * lleva su acción incorporada en lugar de obligar a buscarla.
 */
export function AlertRow({
  icon: Icon,
  tone = 'warn',
  title,
  detail,
  href,
  count,
}: {
  icon: LucideIcon
  tone?: 'warn' | 'risk' | 'info' | 'ok'
  title: string
  detail?: string
  href?: string
  count?: number
}) {
  const tones = {
    warn: 'bg-warn-surface text-warn',
    risk: 'bg-risk-surface text-risk',
    info: 'bg-info-surface text-info',
    ok: 'bg-ok-surface text-ok',
  } as const

  const body = (
    <>
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', tones[tone])}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{title}</span>
        {detail && <span className="block truncate text-xs text-ink-soft">{detail}</span>}
      </span>
      {count !== undefined && <span className="numeral shrink-0 text-lg text-ink">{count}</span>}
      {href && <ArrowRight className="size-4 shrink-0 text-ink-faint" aria-hidden />}
    </>
  )

  const shell = cn(
    'flex items-center gap-3 rounded-lg px-3 py-2.5',
    'transition-colors duration-150',
    href && 'press hover:bg-sunken',
  )

  return href ? (
    <Link href={href as Route} className={shell}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  )
}
