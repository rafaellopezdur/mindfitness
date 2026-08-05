import { cloneElement, isValidElement } from 'react'
import { cn } from '@/lib/cn'

/**
 * Campo de formulario.
 *
 * Inyecta `aria-describedby` en el control para que el lector de pantalla lea
 * la ayuda o el error junto al campo, sin obligar a cada formulario a repetir
 * el cableado.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined

  const control =
    describedBy && isValidElement<{ 'aria-describedby'?: string }>(children)
      ? cloneElement(children, { 'aria-describedby': describedBy })
      : children

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="flex items-center gap-1 text-sm font-medium text-ink">
        {label}
        {/* Se marca lo obligatorio, no lo opcional: hay menos y satura menos. */}
        {required && (
          <span className="text-brand-600" aria-hidden>
            *
          </span>
        )}
      </label>

      {control}

      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="animate-fade flex items-start gap-1 text-xs font-medium text-risk"
        >
          {error}
        </p>
      )}
    </div>
  )
}

const controlBase = [
  'block w-full rounded-md border bg-surface text-sm text-ink',
  'placeholder:text-ink-faint',
  'transition-[border-color,background-color] duration-150 ease-out',
  'hover:border-line-strong',
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-faint',
]

export function Input({
  className,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        'h-11 px-3',
        invalid ? 'border-risk' : 'border-line-strong',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  invalid,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        'min-h-24 resize-y px-3 py-2.5 leading-relaxed',
        invalid ? 'border-risk' : 'border-line-strong',
        className,
      )}
      {...props}
    />
  )
}

/** Agrupador de campos con título. Evita el formulario de 20 campos seguidos. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface p-5 shadow-flat', className)}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
