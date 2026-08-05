import { PERMISSIONS, type Permission } from '@/shared/constants/permissions'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NAVEGACIÓN
 *
 * Se DERIVA de los permisos: un módulo sin ningún permiso concedido no se
 * renderiza, y un grupo entero desaparece si se queda sin módulos visibles.
 * Esto es presentación, no seguridad: cada página vuelve a verificar en el
 * servidor con `requirePermission`.
 *
 * Los 15 módulos planos eran una lista imposible de recorrer, con la mitad en
 * gris. Agrupados por momento de uso —lo que se hace a diario arriba, lo que
 * se revisa de vez en cuando abajo— se recorren de un vistazo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface NavItem {
  href: string
  label: string
  icon: string
  /** Basta con tener UNO de estos permisos para ver la entrada. */
  anyOf: Permission[]
  /** Aparece en la barra inferior del móvil. */
  mobile?: boolean
  /** El módulo aún no existe: se muestra apagado y no navega. */
  soon?: boolean
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

const P = PERMISSIONS

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operacion',
    label: 'Operación',
    items: [
      { href: '/admin', label: 'Inicio', icon: 'home', anyOf: [], mobile: true },
      {
        href: '/admin/clientes',
        label: 'Clientes',
        icon: 'users',
        anyOf: [P.CLIENT_READ, P.CLIENT_READ_ASSIGNED],
        mobile: true,
      },
      { href: '/admin/acceso', label: 'Acceso rápido', icon: 'scan', anyOf: [P.ACCESS_CARD_READ], mobile: true, soon: true },
      { href: '/admin/asistencia', label: 'Asistencia', icon: 'check', anyOf: [P.ATTENDANCE_CREATE], soon: true },
      { href: '/admin/agenda', label: 'Agenda', icon: 'calendar', anyOf: [P.SCHEDULE_READ], soon: true },
      { href: '/admin/eventos', label: 'Eventos', icon: 'sparkles', anyOf: [P.EVENT_READ, P.EVENT_READ_ASSIGNED], soon: true },
    ],
  },
  {
    id: 'servicios',
    label: 'Servicios',
    items: [
      { href: '/admin/planes', label: 'Planes', icon: 'tag', anyOf: [P.PLAN_CREATE], soon: true },
      { href: '/admin/membresias', label: 'Membresías', icon: 'card', anyOf: [P.MEMBERSHIP_READ], soon: true },
      { href: '/admin/horarios', label: 'Horarios', icon: 'clock', anyOf: [P.SCHEDULE_CREATE], soon: true },
      { href: '/admin/entrenadores', label: 'Entrenadores', icon: 'whistle', anyOf: [P.TRAINER_READ], soon: true },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    items: [
      { href: '/admin/pagos', label: 'Pagos', icon: 'wallet', anyOf: [P.PAYMENT_READ], mobile: true, soon: true },
      { href: '/admin/cartera', label: 'Cartera', icon: 'alert', anyOf: [P.COLLECTION_READ], soon: true },
      { href: '/admin/finanzas', label: 'Ingresos y gastos', icon: 'chart', anyOf: [P.FINANCE_DASHBOARD_READ], soon: true },
      { href: '/admin/liquidaciones', label: 'Liquidaciones', icon: 'receipt', anyOf: [P.TRAINER_SETTLEMENT_READ, P.TRAINER_SETTLEMENT_READ_OWN], soon: true },
    ],
  },
  {
    id: 'gestion',
    label: 'Gestión',
    items: [
      { href: '/admin/reportes', label: 'Reportes', icon: 'report', anyOf: [P.REPORT_OPERATIONAL_READ], soon: true },
      { href: '/admin/usuarios', label: 'Equipo', icon: 'shield', anyOf: [P.USER_READ] },
      { href: '/admin/configuracion', label: 'Configuración', icon: 'settings', anyOf: [P.SETTINGS_READ] },
      { href: '/admin/auditoria', label: 'Auditoría', icon: 'history', anyOf: [P.AUDIT_READ] },
    ],
  },
]

function canSee(item: NavItem, permissions: ReadonlySet<Permission>) {
  return item.anyOf.length === 0 || item.anyOf.some((permission) => permissions.has(permission))
}

/** Grupos con al menos un módulo visible para este rol. */
export function visibleGroups(permissions: ReadonlySet<Permission>): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSee(item, permissions)),
  })).filter((group) => group.items.length > 0)
}

export function visibleNav(permissions: ReadonlySet<Permission>): NavItem[] {
  return visibleGroups(permissions).flatMap((group) => group.items)
}

/**
 * Barra inferior del móvil.
 *
 * Solo módulos que EXISTEN: antes tres de sus cuatro accesos estaban
 * deshabilitados, así que la barra ocupaba espacio sin servir para nada.
 * Se completa con los primeros disponibles hasta cuatro, dejando el quinto
 * hueco para el botón de menú.
 */
export function mobileNav(permissions: ReadonlySet<Permission>): NavItem[] {
  const all = visibleNav(permissions).filter((item) => !item.soon)
  const preferred = all.filter((item) => item.mobile)
  const rest = all.filter((item) => !item.mobile)
  return [...preferred, ...rest].slice(0, 4)
}
