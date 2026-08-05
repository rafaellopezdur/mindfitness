import type { Route } from 'next'
import Link from 'next/link'
import { cn } from '@/lib/cn'

/**
 * Pestañas navegables.
 *
 * Antes había tres implementaciones distintas —ficha de cliente, configuración
 * y auditoría— con el mismo aspecto y el código repetido. Esta es la única.
 *
 * Son enlaces reales, no botones: cada pestaña tiene su URL, así que se puede
 * compartir, recargar y volver atrás.
 */
export function Tabs({
  items,
  active,
  className,
}: {
  items: { key: string; label: string; href: string; count?: number }[]
  active: string
  className?: string
}) {
  return (
    <nav
      aria-label="Secciones"
      className={cn('-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}
    >
      <ul className="scroll-slim flex min-w-max gap-1 border-b border-line">
        {items.map((item) => {
          const isActive = item.key === active
          return (
            <li key={item.key}>
              <Link
                href={item.href as Route}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm',
                  'transition-colors duration-150',
                  isActive ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink',
                )}
              >
                {item.label}
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={cn(
                      'tabular rounded-full px-1.5 py-0.5 text-2xs font-semibold',
                      isActive ? 'bg-brand-100 text-brand-700' : 'bg-sunken text-ink-soft',
                    )}
                  >
                    {item.count}
                  </span>
                )}

                {/* El subrayado activo es el gesto de la marca: se anima al
                    cambiar de pestaña en lugar de aparecer de golpe. */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-0 -bottom-px h-0.5 rounded-full',
                    'origin-left transition-transform duration-200 ease-out',
                    isActive
                      ? 'scale-x-100 bg-gradient-to-r from-brand-400 to-brand-600'
                      : 'scale-x-0 bg-transparent',
                  )}
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
