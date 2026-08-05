import { AlertTriangle, Ban, CheckCircle2, Clock, Info, MinusCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_TONE, type ClientStatus } from '@/server/domain/clients'

/**
 * Único lugar donde un estado se traduce a color, icono y etiqueta.
 *
 * Siempre icono + texto, nunca solo color: por daltonismo y porque en el móvil
 * un punto de color no se lee de un vistazo (docs/08-identidad-visual.md §2).
 */
const TONES = {
  ok: { className: 'bg-success-bg text-success', Icon: CheckCircle2 },
  warn: { className: 'bg-warning-bg text-warning', Icon: Clock },
  error: { className: 'bg-danger-bg text-danger', Icon: AlertTriangle },
  info: { className: 'bg-info-bg text-info', Icon: Info },
  idle: { className: 'bg-idle-bg text-idle', Icon: MinusCircle },
} as const

export function StatusBadge({
  status,
  className,
}: {
  status: ClientStatus
  className?: string
}) {
  const tone = TONES[CLIENT_STATUS_TONE[status]]
  const Icon = status === 'BLOCKED' ? Ban : tone.Icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tone.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {CLIENT_STATUS_LABELS[status]}
    </span>
  )
}
