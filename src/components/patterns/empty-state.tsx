import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Estado vacío.
 *
 * Tres variantes con intención distinta, porque «todavía no hay nada» y «tu
 * búsqueda no encontró nada» son situaciones diferentes y merecen respuestas
 * diferentes. Nunca un «sin datos» a secas.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  variant = 'empty',
  className,
}: {
  icon?: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  /** `empty`: aún no hay nada · `search`: nada coincide · `soon`: llega después */
  variant?: 'empty' | 'search' | 'soon'
  className?: string
}) {
  return (
    <div
      className={cn(
        'animate-rise flex flex-col items-center rounded-xl px-6 py-14 text-center',
        variant === 'soon'
          ? 'border border-dashed border-line-strong bg-transparent'
          : 'border border-line bg-surface shadow-flat',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mb-4 grid size-12 place-items-center rounded-xl',
          variant === 'soon' ? 'bg-sunken text-ink-faint' : 'bg-brand-50 text-brand-600',
        )}
      >
        <Icon className="size-5" />
      </span>

      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
