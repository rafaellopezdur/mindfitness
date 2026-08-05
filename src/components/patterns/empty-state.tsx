/**
 * Estado vacío útil: explica y ofrece la acción.
 * Nunca "no hay datos" a secas (docs/08-identidad-visual.md §6).
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[--color-border-strong] px-6 py-12 text-center">
      <p className="text-sm font-medium text-[--color-text]">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[--color-text-muted]">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
