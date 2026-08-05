import { PERMISSIONS, type Permission } from '@/shared/constants/permissions'

/**
 * La navegación se DERIVA de los permisos: un módulo sin ningún permiso
 * concedido no se renderiza (docs/03-roles-y-permisos.md §4.8).
 *
 * Esto es cosmética, no seguridad: cada página vuelve a verificar el permiso
 * en el servidor con `requirePermission`.
 */
export interface NavItem {
  href: string
  label: string
  icon: string
  /** Basta con tener UNO de estos permisos para ver la entrada. */
  anyOf: Permission[]
  /** Aparece en la barra inferior del móvil. */
  mobile?: boolean
  soon?: boolean
}

const P = PERMISSIONS

export const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Inicio', icon: 'home', anyOf: [], mobile: true },
  {
    href: '/admin/clientes',
    label: 'Clientes',
    icon: 'users',
    anyOf: [P.CLIENT_READ, P.CLIENT_READ_ASSIGNED],
    mobile: true,
  },
  { href: '/admin/acceso', label: 'Acceso rápido', icon: 'scan', anyOf: [P.ACCESS_CARD_READ], mobile: true, soon: true },
  { href: '/admin/pagos', label: 'Pagos', icon: 'wallet', anyOf: [P.PAYMENT_READ], mobile: true, soon: true },
  { href: '/admin/asistencia', label: 'Asistencia', icon: 'check', anyOf: [P.ATTENDANCE_CREATE], soon: true },
  { href: '/admin/membresias', label: 'Membresías', icon: 'card', anyOf: [P.MEMBERSHIP_READ], soon: true },
  { href: '/admin/planes', label: 'Planes', icon: 'tag', anyOf: [P.PLAN_CREATE], soon: true },
  { href: '/admin/horarios', label: 'Horarios', icon: 'calendar', anyOf: [P.SCHEDULE_READ], soon: true },
  { href: '/admin/eventos', label: 'Eventos', icon: 'sparkles', anyOf: [P.EVENT_READ, P.EVENT_READ_ASSIGNED], soon: true },
  { href: '/admin/cartera', label: 'Cartera', icon: 'alert', anyOf: [P.COLLECTION_READ], soon: true },
  { href: '/admin/finanzas', label: 'Finanzas', icon: 'chart', anyOf: [P.FINANCE_DASHBOARD_READ], soon: true },
  { href: '/admin/reportes', label: 'Reportes', icon: 'report', anyOf: [P.REPORT_OPERATIONAL_READ], soon: true },
  { href: '/admin/configuracion', label: 'Configuración', icon: 'settings', anyOf: [P.SETTINGS_READ] },
  { href: '/admin/usuarios', label: 'Usuarios', icon: 'shield', anyOf: [P.USER_READ] },
  { href: '/admin/auditoria', label: 'Auditoría', icon: 'history', anyOf: [P.AUDIT_READ] },
]

export function visibleNav(permissions: ReadonlySet<Permission>): NavItem[] {
  return NAV_ITEMS.filter((item) => item.anyOf.length === 0 || item.anyOf.some((p) => permissions.has(p)))
}
