'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  History,
  Home,
  ScanLine,
  Settings,
  Shield,
  Sparkles,
  Tag,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { NavItem } from './nav-items'

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  scan: ScanLine,
  wallet: Wallet,
  check: CheckCircle2,
  card: CreditCard,
  tag: Tag,
  calendar: CalendarDays,
  sparkles: Sparkles,
  alert: AlertCircle,
  chart: BarChart3,
  report: ClipboardList,
  settings: Settings,
  shield: Shield,
  history: History,
}

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-0.5 p-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? Home
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={(item.soon ? '#' : item.href) as Route}
            aria-current={active ? 'page' : undefined}
            aria-disabled={item.soon || undefined}
            onClick={item.soon ? (e) => e.preventDefault() : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-brand-50 font-medium text-brand-700'
                : 'text-[--color-text-muted] hover:bg-[--color-surface-sunken] hover:text-[--color-text]',
              item.soon && 'cursor-not-allowed opacity-40 hover:bg-transparent',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
            {item.soon && <span className="ml-auto text-[10px] uppercase tracking-wide">pronto</span>}
          </Link>
        )
      })}
    </nav>
  )
}

/** Barra inferior fija: es la navegación real en el móvil de recepción. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const primary = items.filter((i) => i.mobile).slice(0, 5)

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[--color-border] bg-[--color-surface-raised] pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {/* Las columnas se ajustan al número real de accesos del rol: el
          entrenador ve menos que recepción y no debe quedar un hueco. */}
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${primary.length}, minmax(0, 1fr))` }}>
        {primary.map((item) => {
          const Icon = ICONS[item.icon] ?? Home
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={(item.soon ? '#' : item.href) as Route}
                aria-current={active ? 'page' : undefined}
                onClick={item.soon ? (event) => event.preventDefault() : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px]',
                  active ? 'text-brand-700' : 'text-[--color-text-muted]',
                  item.soon && 'opacity-40',
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
