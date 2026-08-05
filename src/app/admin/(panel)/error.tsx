'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Los errores se muestran comprensibles y con salida. Nunca una traza técnica
 * en pantalla (docs/08-identidad-visual.md §7.6).
 */
export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // En producción esto va al registro de errores (Sentry).
    console.error(error)
  }, [error])

  const isForbidden = error.message === 'No tienes permiso para realizar esta acción.'

  return (
    <div className="grid min-h-[60vh] grid-cols-1 place-items-center">
      <div className="w-full max-w-md text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger">
          <ShieldAlert className="size-6" aria-hidden />
        </span>

        <h1 className="mt-4 text-lg font-semibold text-[--color-text]">
          {isForbidden ? 'No tienes acceso a esta sección' : 'Algo salió mal'}
        </h1>

        <p className="mt-2 text-sm text-[--color-text-muted]">
          {isForbidden
            ? 'Tu rol no incluye este permiso. Si crees que deberías tenerlo, pídeselo a una administradora.'
            : 'No pudimos completar la operación. Puedes intentarlo de nuevo.'}
        </p>

        {error.digest && (
          <p className="mt-3 text-xs text-[--color-text-subtle]">
            Código de error: <code className="tabular">{error.digest}</code>
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          {!isForbidden && (
            <Button variant="secondary" onClick={reset}>
              Reintentar
            </Button>
          )}
          <Link href="/admin">
            <Button>Volver al inicio</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
