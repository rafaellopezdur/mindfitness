import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

/**
 * Botón.
 *
 * Altura mínima de 44 px en los tamaños operativos: recepción lo usa de pie,
 * con prisa y con gente delante.
 */
const button = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'font-medium press select-none',
    'transition-[background-color,color,border-color] duration-150 ease-out',
    'disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
        // Secundario: borde, sin relleno. No compite con la acción primaria.
        secondary: 'border border-line-strong bg-surface text-ink hover:bg-sunken',
        ghost: 'text-ink-soft hover:bg-sunken hover:text-ink',
        // Sutil: relleno de marca muy claro. Para acciones frecuentes no primarias.
        subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
        danger: 'bg-risk text-white hover:brightness-110',
        night: 'bg-night text-white hover:bg-night-soft',
      },
      size: {
        xs: 'h-8 px-2.5 text-xs',
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-11 shrink-0 p-0',
        'icon-sm': 'size-9 shrink-0 p-0',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({ className, variant, size, block, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size, block }), className)} {...props} />
}

/** Mismos estilos para un enlace que actúa como botón. */
export function buttonClass(opts: VariantProps<typeof button> & { className?: string } = {}) {
  const { className, ...variants } = opts
  return cn(button(variants), className)
}
