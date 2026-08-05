import { Logo } from '@/components/admin/logo'

/**
 * Marcador de posición del portal público.
 * La landing real se construye en la Fase 6 (docs/10-fases-desarrollo.md).
 */
export default function HomePage() {
  // `grid-cols-1` no es decorativo: sin él la columna `auto` se dimensiona al
  // max-content del hijo y el texto desborda el viewport en móvil.
  // `grid-cols-1` es `minmax(0,1fr)`, que ata la columna al ancho real.
  return (
    <main className="grid min-h-dvh grid-cols-1 place-items-center bg-ink px-6 text-center">
      <div className="flex w-full max-w-lg flex-col items-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500 sm:text-sm">
          Portal en construcción
        </p>
        <Logo variant="blanco" className="mt-5 h-14 w-auto max-w-full sm:h-20" priority />
        <p className="mt-6 text-balance text-stone-400">
          El sitio público estará disponible próximamente. El portal administrativo se encuentra en{' '}
          <span className="font-medium text-stone-200">/admin</span>.
        </p>
      </div>
    </main>
  )
}
