import { SkeletonPage } from '@/components/ui/skeleton'

/**
 * Estado de carga del panel.
 *
 * Antes no existía y la navegación se sentía congelada mientras el servidor
 * respondía. El esqueleto tiene la forma real del contenido —cabecera, bloque
 * de métricas, filas— para que no haya salto al aparecer los datos.
 */
export default function PanelLoading() {
  return <SkeletonPage />
}
