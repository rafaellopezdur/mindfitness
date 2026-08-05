import Image from 'next/image'
import { cn } from '@/lib/cn'
import { BUSINESS } from '@/config/placeholders'

/**
 * Logotipo de Mind Fitness Club.
 *
 * Los archivos originales son lienzos cuadrados con mucho margen transparente;
 * `scripts/trim-logo.mjs` los recorta al contenido real (2122×720) para que se
 * puedan dimensionar por altura sin que queden diminutos.
 */
export function Logo({
  variant = 'color',
  className,
  priority,
}: {
  variant?: 'color' | 'blanco'
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src={variant === 'blanco' ? '/logo-blanco.png' : '/logo-color.png'}
      alt={BUSINESS.name}
      width={2122}
      height={720}
      priority={priority}
      className={cn('h-auto w-auto object-contain', className)}
    />
  )
}

/** Marca reducida para la barra lateral plegada: solo la inicial. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white',
        className,
      )}
    >
      M
    </span>
  )
}
