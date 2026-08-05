'use client'

import { useEffect, useState } from 'react'
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
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Settings,
  Shield,
  Sparkles,
  Tag,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn, initials } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Logo, LogoMark } from '@/components/admin/logo'
import { logoutAction } from '@/server/modules/auth/actions'
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

const STORAGE_KEY = 'mfc.sidebar.collapsed'

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

export function AdminShell({
  items,
  fullName,
  roleName,
  children,
}: {
  items: NavItem[]
  fullName: string
  roleName: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // La preferencia se lee tras hidratar para no romper el HTML del servidor.
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    setHydrated(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  // El cajón del móvil se cierra al navegar: si no, tapa la página de destino.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Escape cierra el cajón, como cualquier diálogo.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const width = collapsed ? 'lg:w-[4.5rem]' : 'lg:w-60'
  const offset = collapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-60'

  return (
    <div className="min-h-dvh bg-[--color-surface]">
      {/* ── Barra lateral · escritorio ─────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[--color-border] bg-[--color-surface-raised] lg:flex',
          hydrated && 'transition-[width] duration-200',
          width,
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center border-b border-[--color-border]',
            collapsed ? 'justify-center px-2' : 'px-4',
          )}
        >
          <Link href="/admin" className="flex min-w-0 items-center gap-2" aria-label="Ir al inicio">
            {collapsed ? <LogoMark /> : <Logo className="h-7 max-w-[10rem]" priority />}
          </Link>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto p-2">
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-[--color-border] p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className={cn(
              'mb-1 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-[--color-text-muted]',
              'transition-colors hover:bg-[--color-surface-sunken] hover:text-[--color-text]',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="size-4 shrink-0" aria-hidden />
                <span>Contraer menú</span>
              </>
            )}
          </button>

          <UserBlock fullName={fullName} roleName={roleName} collapsed={collapsed} />
        </div>
      </aside>

      {/* ── Cabecera · móvil ───────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[--color-border] bg-[--color-surface-raised] px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
          className="grid size-11 place-items-center rounded-lg text-[--color-text-muted] hover:bg-[--color-surface-sunken]"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <Link href="/admin" aria-label="Ir al inicio">
          <Logo className="h-6 max-w-[9rem]" priority />
        </Link>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm" aria-label="Cerrar sesión">
            <LogOut className="size-4" aria-hidden />
          </Button>
        </form>
      </header>

      {/* ── Cajón · móvil ──────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[--color-surface-raised] shadow-xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-[--color-border] px-4">
              <Logo className="h-6 max-w-[9rem]" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
                className="grid size-10 place-items-center rounded-lg text-[--color-text-muted] hover:bg-[--color-surface-sunken]"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto p-2">
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={isActive(pathname, item.href)} collapsed={false} />
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t border-[--color-border] p-2">
              <UserBlock fullName={fullName} roleName={roleName} collapsed={false} />
            </div>
          </div>
        </div>
      )}

      <main className={cn('px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pt-8', hydrated && 'transition-[margin] duration-200', offset)}>
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <MobileNav items={items} pathname={pathname} />
    </div>
  )
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = ICONS[item.icon] ?? Home

  return (
    <Link
      href={(item.soon ? '#' : item.href) as Route}
      aria-current={active ? 'page' : undefined}
      aria-disabled={item.soon || undefined}
      onClick={item.soon ? (event) => event.preventDefault() : undefined}
      // Plegada, el nombre solo existe como tooltip nativo: sigue siendo
      // alcanzable por teclado y por lector de pantalla.
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex min-h-10 items-center gap-3 rounded-lg text-sm transition-colors',
        collapsed ? 'justify-center px-0' : 'px-3',
        active
          ? 'bg-brand-50 font-medium text-brand-700'
          : 'text-[--color-text-muted] hover:bg-[--color-surface-sunken] hover:text-[--color-text]',
        item.soon && 'cursor-not-allowed opacity-40 hover:bg-transparent',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <>
          <span className="truncate">{item.label}</span>
          {item.soon && <span className="ml-auto text-[10px] uppercase tracking-wide">pronto</span>}
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
          className="grid min-h-10 w-full place-items-center rounded-lg text-[--color-text-muted] hover:bg-[--color-surface-sunken] hover:text-[--color-text]"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </form>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 px-2 py-2">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800"
        >
          {initials(fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[--color-text]">{fullName}</p>
          <p className="truncate text-xs text-[--color-text-muted]">{roleName}</p>
        </div>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="block" className="justify-start">
          <LogOut className="size-4" aria-hidden />
          Cerrar sesión
        </Button>
      </form>
    </>
  )
}

function MobileNav({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const primary = items.filter((item) => item.mobile).slice(0, 5)
  if (primary.length === 0) return null

  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[--color-border] bg-[--color-surface-raised] pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
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
