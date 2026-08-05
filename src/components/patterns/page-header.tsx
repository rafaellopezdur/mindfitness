import type { Route } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Cabecera de página. Responde «¿dónde estoy?» antes que nada, y deja la
 * acción principal siempre en el mismo sitio.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  back,
  actions,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  back?: { href: string; label: string }
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-6', className)}>
      {back && (
        <Link
          href={back.href as Route}
          className={cn(
            'mb-3 inline-flex items-center gap-1.5 rounded-md text-sm text-ink-soft',
            'transition-colors duration-150 hover:text-ink',
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  )
}
