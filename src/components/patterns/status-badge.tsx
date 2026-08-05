import { Ban } from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_TONE, type ClientStatus } from '@/server/domain/clients'

/**
 * Único lugar donde el estado de un cliente se traduce a color, icono y
 * etiqueta. Se apoya en `Badge`, que ya garantiza icono + texto.
 */
const TONE_MAP: Record<string, BadgeTone> = {
  ok: 'ok',
  warn: 'warn',
  error: 'risk',
  info: 'info',
  idle: 'mute',
}

export function StatusBadge({ status, className }: { status: ClientStatus; className?: string }) {
  return (
    <Badge
      tone={TONE_MAP[CLIENT_STATUS_TONE[status]] ?? 'mute'}
      icon={status === 'BLOCKED' ? Ban : undefined}
      className={className}
    >
      {CLIENT_STATUS_LABELS[status]}
    </Badge>
  )
}
