import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const button = cva(
  // 44px de alto mínimo: recepción lo usa de pie y con prisa (docs/08 §7.7).
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ' +
    'disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-brand-500 text-white hover:bg-brand-600 focus-visible:outline-brand-700',
        secondary:
          'border border-[--color-border-strong] bg-[--color-surface-raised] text-[--color-text] hover:bg-[--color-surface-sunken]',
        ghost: 'text-[--color-text-muted] hover:bg-[--color-surface-sunken] hover:text-[--color-text]',
        danger: 'bg-danger text-white hover:brightness-110 focus-visible:outline-danger',
        ink: 'bg-ink text-white hover:bg-ink-soft',
      },
      size: {
        sm: 'min-h-9 px-3 text-xs',
        md: 'px-4 py-2',
        lg: 'min-h-12 px-6 text-base',
        block: 'w-full px-4 py-2',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size }), className)} {...props} />
}
