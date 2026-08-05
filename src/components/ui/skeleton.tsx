import { cn } from '@/lib/cn'

/**
 * Esqueleto de carga.
 *
 * El brillo se hace con `transform` sobre un pseudo-elemento, no animando
 * `background-position`: así vive en el hilo de composición y no repinta.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative block overflow-hidden rounded-md bg-sunken',
        'after:absolute after:inset-0 after:animate-[mfc-shimmer_1.6s_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-white/55 after:to-transparent',
        'dark:after:via-white/8',
        className,
      )}
    />
  )
}

/** Esqueleto con la forma real de una fila de listado. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  )
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando">
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </div>
  )
}

export function SkeletonPage() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <SkeletonList rows={4} />
    </div>
  )
}
