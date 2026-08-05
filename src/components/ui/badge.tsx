import { cva, type VariantProps } from 'class-variance-authority'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Info,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Distintivo de estado.
 *
 * Siempre icono + texto, nunca solo color: por daltonismo, y porque de lejos
 * un punto de color no se lee — y esto se lee de lejos, en el mostrador.
 */
const badge = cva(
  'inline-flex items-center gap-1 rounded-full font-medium transition-colors duration-150',
  {
    variants: {
      tone: {
        ok: 'bg-ok-surface text-ok',
        warn: 'bg-warn-surface text-warn',
        risk: 'bg-risk-surface text-risk',
        info: 'bg-info-surface text-info',
        mute: 'bg-mute-surface text-mute',
        brand: 'bg-brand-50 text-brand-700',
      },
      size: {
        sm: 'px-2 py-0.5 text-2xs',
        md: 'px-2.5 py-1 text-xs',
      },
    },
    defaultVariants: { tone: 'mute', size: 'sm' },
  },
)

export type BadgeTone = NonNullable<VariantProps<typeof badge>['tone']>

const TONE_ICON: Record<BadgeTone, LucideIcon> = {
  ok: CheckCircle2,
  warn: Clock,
  risk: AlertTriangle,
  info: Info,
  mute: CircleDashed,
  brand: CheckCircle2,
}

export function Badge({
  tone = 'mute',
  size,
  icon: IconOverride,
  showIcon = true,
  className,
  children,
}: VariantProps<typeof badge> & {
  icon?: LucideIcon
  showIcon?: boolean
  className?: string
  children: React.ReactNode
}) {
  const Icon = IconOverride ?? TONE_ICON[tone ?? 'mute']
  return (
    <span className={cn(badge({ tone, size }), className)}>
      {showIcon && <Icon className="size-3 shrink-0" aria-hidden />}
      {children}
    </span>
  )
}

export { Ban as BlockedIcon }
