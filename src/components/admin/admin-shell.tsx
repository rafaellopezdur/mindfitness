'use client'

import { useEffect, useState } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AlertCircle,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  Dumbbell,
  History,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  ScanLine,
  Settings,
  Shield,
  Sparkles,
  Tag,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { cn, initials } from '@/lib/cn'
import { Button, buttonClass } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Logo, LogoMark } from '@/components/admin/logo'
import { logoutAction } from '@/server/modules/auth/actions'
import type { NavGroup, NavItem } from './nav-items'

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  scan: ScanLine,
  check: CheckCircle2,
  calendar: CalendarDays,
  sparkles: Sparkles,
  tag: Tag,
  card: CreditCard,
  clock: Clock,
  whistle: Dumbbell,
  wallet: Wallet,
  alert: AlertCircle,
  chart: BarChart3,
  receipt: Receipt,
  report: ClipboardList,
  shield: Shield,
  settings: Settings,
  history: History,
}

const STORAGE_KEY = 'mfc.sidebar.collapsed'

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

export function AdminShell({
  groups,
  mobileItems,
  fullName,
  roleName,
  quickAction,
  children,
}: {
  groups: NavGroup[]
  mobileItems: NavItem[]
  fullName: string
  roleName: string
  /** Acción principal del rol: el botón flotante del móvil. */
  quickAction?: { href: string; label: string }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    setHydrated(true)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  function toggle() {
    setCollapsed((previous) => {
      const next = !previous
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="min-h-dvh bg-canvas">
      {/* ═══ Barra lateral · escritorio ═══════════════════════════════ */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface lg:flex',
          hydrated && 'transition-[width] duration-200 ease-out',
          collapsed ? 'w-[4.25rem]' : 'w-60',
        )}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center border-b border-line',
            collapsed ? 'justify-center px-2' : 'px-4',
          )}
        >
          <Link href="/admin" aria-label="Ir al inicio" className="flex min-w-0 items-center">
            {collapsed ? <LogoMark /> : <Logo className="h-6 max-w-[9.5rem]" priority />}
          </Link>
        </div>

        <nav aria-label="Navegación principal" className="scroll-slim flex-1 overflow-y-auto px-2 py-3">
          {groups.map((group) => (
            <div key={group.id} className="mb-4 last:mb-0">
              {!collapsed && <p className="eyebrow px-2.5 pb-1.5">{group.label}</p>}
              {collapsed && <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden />}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-line p-2">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className={cn(
              'mb-1 flex h-10 w-full items-center gap-3 rounded-md px-2.5 text-sm text-ink-soft',
              'transition-colors duration-150 hover:bg-sunken hover:text-ink',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="size-4 shrink-0" aria-hidden />
                <span>Contraer</span>
              </>
            )}
            <span className="sr-only">{collapsed ? 'Expandir menú' : 'Contraer menú'}</span>
          </button>

          <UserBlock fullName={fullName} roleName={roleName} collapsed={collapsed} />
        </div>
      </aside>

      {/* ═══ Cabecera · móvil ═════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-2 backdrop-blur lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
          <Menu className="size-5" aria-hidden />
        </Button>

        <Link href="/admin" aria-label="Ir al inicio" className="mx-auto">
          <Logo className="h-5 max-w-[8.5rem]" priority />
        </Link>

        <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative">
          <Bell className="size-5" aria-hidden />
        </Button>
      </header>

      {/* ═══ Menú completo · móvil ════════════════════════════════════ */}
      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Menú"
        side="bottom"
        className="sm:animate-sheet-up sm:mb-0 sm:mt-auto sm:h-auto sm:w-full sm:max-w-none sm:rounded-t-2xl"
      >
        <div className="pb-2">
          {groups.map((group) => (
            <div key={group.id} className="mb-4 last:mb-0">
              <p className="eyebrow mb-1.5 px-1">{group.label}</p>
              <ul className="grid grid-cols-2 gap-1.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      active={isActive(pathname, item.href)}
                      collapsed={false}
                      compact
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mt-5 border-t border-line pt-4">
            <UserBlock fullName={fullName} roleName={roleName} collapsed={false} />
          </div>
        </div>
      </Sheet>

      {/* ═══ Contenido ════════════════════════════════════════════════ */}
      <main
        className={cn(
          'px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-8',
          hydrated && 'transition-[margin] duration-200 ease-out',
          collapsed ? 'lg:ml-[4.25rem]' : 'lg:ml-60',
        )}
      >
        <div key={pathname} className="animate-rise mx-auto w-full max-w-6xl">
          {children}
        </div>
      </main>

      {/* ═══ Barra inferior + acción rápida · móvil ═══════════════════ */}
      <MobileBar items={mobileItems} pathname={pathname} quickAction={quickAction} />
    </div>
  )
}

function NavLink({
  item,
  active,
  collapsed,
  compact,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  compact?: boolean
}) {
  const Icon = ICONS[item.icon] ?? Home

  return (
    <Link
      href={(item.soon ? '#' : item.href) as Route}
      aria-current={active ? 'page' : undefined}
      aria-disabled={item.soon || undefined}
      onClick={item.soon ? (event) => event.preventDefault() : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md text-sm',
        'transition-colors duration-150 ease-out',
        compact ? 'h-11 px-3' : 'h-9 px-2.5',
        collapsed && 'justify-center px-0',
        active ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-soft hover:bg-sunken hover:text-ink',
        item.soon && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-ink-soft',
      )}
    >
      {/* El trazo del logotipo, reinterpretado como marca de posición. */}
      {active && !collapsed && (
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gradient-to-b from-brand-300 to-brand-600"
        />
      )}

      <Icon className="size-4 shrink-0" aria-hidden />

      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <>
          <span className="truncate">{item.label}</span>
          {item.soon && (
            <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wider text-ink-faint">
              pronto
            </span>
          )}
        </>
      )}
    </Link>
  )
}

function UserBlock({
  fullName,
  roleName,
  collapsed,
}: {
  fullName: string
  roleName: string
  collapsed: boolean
}) {
  if (collapsed) {
    return (
      <form action={logoutAction}>
        <button
          type="submit"
          title={`${fullName} · Cerrar sesión`}
          aria-label={`${fullName}. Cerrar sesión`}
          className="grid h-10 w-full place-items-center rounded-md text-ink-soft transition-colors duration-150 hover:bg-sunken hover:text-ink"
        >
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-full bg-brand-100 text-2xs font-semibold text-brand-800"
          >
            {initials(fullName)}
          </span>
        </button>
      </form>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2.5 px-2 py-2">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-2xs font-semibold text-brand-800"
        >
          {initials(fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{fullName}</p>
          <p className="truncate text-xs text-ink-soft">{roleName}</p>
        </div>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="sm" block className="justify-start">
          <LogOut className="size-4" aria-hidden />
          Cerrar sesión
        </Button>
      </form>
    </>
  )
}

/**
 * Barra inferior con acción rápida centrada.
 *
 * El botón flotante ocupa el centro, que es donde llega el pulgar. Los accesos
 * se reparten a los lados, y solo aparecen módulos que existen de verdad.
 */
function MobileBar({
  items,
  pathname,
  quickAction,
}: {
  items: NavItem[]
  pathname: string
  quickAction?: { href: string; label: string }
}) {
  if (items.length === 0) return null

  const half = Math.ceil(items.length / 2)
  const left = items.slice(0, half)
  const right = items.slice(half)

  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="relative flex items-stretch">
        <BarSide items={left} pathname={pathname} />

        {quickAction && (
          <div className="relative w-16 shrink-0">
            <Link
              href={quickAction.href as Route}
              aria-label={quickAction.label}
              className={cn(
                buttonClass({ variant: 'primary' }),
                'absolute -top-5 left-1/2 size-14 -translate-x-1/2 rounded-full p-0 shadow-float',
              )}
            >
              <Plus className="size-6" aria-hidden />
            </Link>
          </div>
        )}

        <BarSide items={right} pathname={pathname} />
      </div>
    </nav>
  )
}

function BarSide({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="grid flex-1" style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, 1fr)` }}>
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? Home
        const active = isActive(pathname, item.href)
        return (
          <li key={item.href}>
            <Link
              href={item.href as Route}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'press flex h-16 flex-col items-center justify-center gap-1 px-1 text-[10px]',
                'transition-colors duration-150',
                active ? 'text-brand-700' : 'text-ink-soft',
              )}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {active && (
                  <span
                    aria-hidden
                    className="absolute -top-2 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-brand-500"
                  />
                )}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
