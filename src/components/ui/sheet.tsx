'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './button'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PANEL FLOTANTE · drawer, hoja inferior y modal
 *
 * Construido sobre `<dialog>` nativo, que aporta gratis y bien resuelto:
 * atrapado del foco, cierre con Escape, capa superior real (`::backdrop`, por
 * encima de cualquier `z-index`) e inerte para el lector de pantalla.
 *
 * La misma pieza cambia de forma según el dispositivo, que es justo lo que se
 * pedía: en móvil sube desde abajo (al alcance del pulgar) y en escritorio
 * entra por el lateral o se centra.
 * ═══════════════════════════════════════════════════════════════════════════
 */

type SheetSide = 'right' | 'bottom' | 'center' | 'responsive'

export function Sheet({
  open,
  onClose,
  title,
  description,
  side = 'responsive',
  footer,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  /** `responsive`: hoja inferior en móvil, lateral en escritorio. */
  side?: SheetSide
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Escape y clic en el fondo cierran, como cualquier diálogo.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const onCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('click', onClick)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('click', onClick)
    }
  }, [onClose])

  const shape =
    side === 'center'
      ? 'animate-rise m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl'
      : side === 'right'
        ? 'animate-sheet-right ml-auto mr-0 h-dvh max-h-none w-[min(30rem,100vw)] rounded-none'
        : side === 'bottom'
          ? 'animate-sheet-up mb-0 mt-auto w-full max-w-none rounded-t-2xl'
          : // responsive
            'animate-sheet-up mb-0 mt-auto w-full max-w-none rounded-t-2xl ' +
            'sm:animate-sheet-right sm:ml-auto sm:mr-0 sm:mt-0 sm:h-dvh sm:max-h-none sm:w-[min(30rem,100vw)] sm:rounded-none'

  return (
    <dialog
      ref={ref}
      aria-labelledby="sheet-title"
      className={cn(
        'max-h-[90dvh] bg-surface p-0 text-ink shadow-float',
        'backdrop:bg-night/45 backdrop:backdrop-blur-[2px]',
        shape,
        className,
      )}
    >
      <div className="flex max-h-[90dvh] flex-col sm:max-h-dvh">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id="sheet-title" className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Cerrar">
            <X className="size-4" aria-hidden />
          </Button>
        </header>

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  )
}

/**
 * Confirmación de acción destructiva.
 * Para lo irreversible se exige escribir una palabra: un clic de más evita
 * un error que no se puede deshacer. Confirmar TODO enseña a ignorar avisos,
 * así que esto se reserva de verdad para lo grave.
 */
export function ConfirmAction({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  requireText,
  tone = 'danger',
  pending,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  /** Si se indica, hay que escribirlo tal cual para habilitar el botón. */
  requireText?: string
  tone?: 'danger' | 'primary'
  pending?: boolean
}) {
  const [typed, setTyped] = useState('')

  // Se limpia cada vez que el diálogo se vuelve a abrir.
  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  const blocked = Boolean(requireText) && typed.trim() !== requireText

  return (
    <Sheet open={open} onClose={onClose} title={title} side="center">
      <p className="text-sm leading-relaxed text-ink-soft">{message}</p>

      {requireText && (
        <label className="mt-4 block space-y-1.5">
          <span className="text-sm font-medium text-ink">
            Escribe <span className="font-semibold text-ink">{requireText}</span> para confirmar
          </span>
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
          />
        </label>
      )}

      <div className="mt-6 flex gap-2">
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          disabled={blocked || pending}
          onClick={onConfirm}
        >
          {pending ? 'Procesando…' : confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Sheet>
  )
}

