'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SELECTOR · sustituye al `<select>` nativo
 *
 * El nativo rompía el sistema visual y en móvil abre la rueda del sistema
 * operativo. Este está construido sobre el patrón ARIA de combobox:
 *
 *   · `role="combobox"` + `aria-expanded` + `aria-controls` en el disparador
 *   · `role="listbox"` / `role="option"` + `aria-selected` en la lista
 *   · `aria-activedescendant` para que el lector anuncie la opción marcada
 *     sin mover el foco real, que se queda en el campo de búsqueda
 *   · ↑ ↓ Inicio Fin Enter Esc, y Tab cierra
 *
 * Mantiene un `<input type="hidden">` con el valor, de modo que sigue
 * funcionando dentro de un `<form>` con Server Actions, igual que el nativo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface SelectOption {
  value: string
  label: string
  /** Segunda línea: documento, precio, especialidad… según el contexto. */
  description?: string
  /** Iniciales o texto corto para el avatar. */
  avatar?: string
  icon?: React.ReactNode
  /** Distintivo a la derecha: estado, disponibilidad, cupo. */
  badge?: React.ReactNode
  disabled?: boolean
  group?: string
}

interface SelectProps {
  name: string
  options: SelectOption[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  /** Muestra el buscador interno. Automático a partir de 7 opciones. */
  searchable?: boolean
  searchPlaceholder?: string
  clearable?: boolean
  disabled?: boolean
  loading?: boolean
  invalid?: boolean
  emptyMessage?: string
  id?: string
  className?: string
  'aria-describedby'?: string
}

export function Select({
  name,
  options,
  defaultValue = '',
  value: controlledValue,
  onValueChange,
  placeholder = 'Selecciona una opción',
  searchable,
  searchPlaceholder = 'Buscar…',
  clearable,
  disabled,
  loading,
  invalid,
  emptyMessage = 'Sin coincidencias',
  id,
  className,
  ...aria
}: SelectProps) {
  const reactId = useId()
  const listId = `${reactId}-list`
  const triggerId = id ?? `${reactId}-trigger`

  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlledValue ?? uncontrolled

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const showSearch = searchable ?? options.length >= 7
  const selected = options.find((option) => option.value === value)

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const folded = query
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
    return options.filter((option) =>
      `${option.label} ${option.description ?? ''}`
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .includes(folded),
    )
  }, [options, query])

  // Al abrir: el foco va al buscador si existe, y se marca lo ya elegido.
  useEffect(() => {
    if (!open) return
    setQuery('')
    const index = filtered.findIndex((option) => option.value === value)
    setActiveIndex(index >= 0 ? index : 0)
    if (showSearch) requestAnimationFrame(() => searchRef.current?.focus())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Cierre al hacer clic fuera o al perder el foco hacia otro control.
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  // La opción marcada se mantiene siempre a la vista al navegar con teclado.
  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  function commit(next: string) {
    if (controlledValue === undefined) setUncontrolled(next)
    onValueChange?.(next)
    setOpen(false)
    requestAnimationFrame(() => document.getElementById(triggerId)?.focus())
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
        event.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(filtered.length - 1)
        break
      case 'Enter': {
        event.preventDefault()
        const option = filtered[activeIndex]
        if (option && !option.disabled) commit(option.value)
        break
      }
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        document.getElementById(triggerId)?.focus()
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        id={triggerId}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        aria-describedby={aria['aria-describedby']}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-md border bg-surface px-3 text-left text-sm',
          'transition-[border-color,background-color] duration-150 ease-out',
          'hover:border-line-strong disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-faint',
          invalid ? 'border-risk' : open ? 'border-brand-500' : 'border-line-strong',
        )}
      >
        {selected?.avatar && (
          <span
            aria-hidden
            className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-2xs font-semibold text-brand-800"
          >
            {selected.avatar}
          </span>
        )}
        {selected?.icon}

        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-ink-faint')}>
          {selected?.label ?? placeholder}
        </span>

        {clearable && selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Quitar selección"
            onClick={(event) => {
              event.stopPropagation()
              commit('')
            }}
            className="grid size-5 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-sunken hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
          </span>
        )}

        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-ink-faint" aria-hidden />
        ) : (
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-ink-faint transition-transform duration-200 ease-out',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div
          className={cn(
            'animate-pop absolute z-50 mt-1.5 w-full origin-top overflow-hidden',
            'rounded-lg border border-line bg-overlay shadow-float',
          )}
        >
          {showSearch && (
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                aria-controls={listId}
                aria-activedescendant={filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
          )}

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Opciones"
            className="scroll-slim max-h-64 overflow-y-auto p-1"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-ink-soft">{emptyMessage}</li>
            )}

            {filtered.map((option, index) => {
              const isSelected = option.value === value
              const isActive = index === activeIndex
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => !option.disabled && commit(option.value)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm',
                    isActive && 'bg-sunken',
                    isSelected && 'text-brand-700',
                    option.disabled && 'cursor-not-allowed opacity-45',
                  )}
                >
                  {option.avatar && (
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-2xs font-semibold text-brand-800"
                    >
                      {option.avatar}
                    </span>
                  )}
                  {option.icon}

                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate', isSelected && 'font-medium')}>
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block truncate text-xs text-ink-soft">{option.description}</span>
                    )}
                  </span>

                  {option.badge}

                  <Check
                    className={cn(
                      'size-4 shrink-0 text-brand-600 transition-opacity duration-150',
                      isSelected ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
