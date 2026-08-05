'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Avisos flotantes.
 *
 * Antes el resultado de guardar vivía dentro del formulario, así que en una
 * página larga el mensaje podía quedar fuera de la vista. Estos aparecen
 * siempre donde se miran: abajo en móvil, esquina inferior en escritorio.
 *
 * El contenedor es `aria-live="polite"`, de modo que el lector de pantalla lo
 * anuncia sin interrumpir lo que la persona esté haciendo.
 */

type ToastTone = 'ok' | 'error' | 'info'

interface Toast {
  id: number
  tone: ToastTone
  title: string
  detail?: string
}

const ToastContext = createContext<{ push: (toast: Omit<Toast, 'id'>) => void } | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return context
}

const ICONS = { ok: CheckCircle2, error: AlertTriangle, info: Info } as const
const TONES = {
  ok: 'border-ok/25 text-ok',
  error: 'border-risk/25 text-risk',
  info: 'border-info/25 text-info',
} as const

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { ...toast, id }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4',
          'pb-[max(1rem,env(safe-area-inset-bottom))]',
          'sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end',
        )}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICONS[toast.tone]

  // Los errores no se van solos: quien necesita leerlos suele estar mirando
  // otra cosa cuando aparecen.
  useEffect(() => {
    if (toast.tone === 'error') return
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [toast.tone, onDismiss])

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'animate-toast pointer-events-auto flex w-full max-w-sm items-start gap-3',
        'rounded-lg border bg-overlay p-3.5 shadow-float',
        TONES[toast.tone],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{toast.title}</p>
        {toast.detail && <p className="mt-0.5 text-xs text-ink-soft">{toast.detail}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
        className="grid size-6 shrink-0 place-items-center rounded-md text-ink-faint hover:bg-sunken hover:text-ink"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}
