import { cloneElement, isValidElement } from 'react'
import { cn } from '@/lib/cn'

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined

  // Se inyecta aria-describedby en el control para que el lector de pantalla
  // lea la ayuda o el error junto al campo, sin obligar a cada formulario a
  // repetir el cableado.
  const control =
    describedBy && isValidElement<{ 'aria-describedby'?: string }>(children)
      ? cloneElement(children, { 'aria-describedby': describedBy })
      : children

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[--color-text]">
        {label}
      </label>
      {control}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-[--color-text-muted]">
          {hint}
        </p>
      )}
      {/* `role=alert` para que el lector de pantalla anuncie el error (WCAG AA). */}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function Input({
  className,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'block min-h-11 w-full rounded-lg border bg-[--color-surface-raised] px-3 py-2 text-sm text-[--color-text]',
        'placeholder:text-[--color-text-subtle]',
        invalid ? 'border-danger' : 'border-[--color-border-strong]',
        className,
      )}
      {...props}
    />
  )
}
