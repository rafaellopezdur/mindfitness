import type { Metadata, Viewport } from 'next'
import { Archivo, Inter } from 'next/font/google'
import { BUSINESS } from '@/config/placeholders'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

/**
 * Familia display: cifras, KPI y titulares de sección.
 *
 * Archivo es geométrica y ligeramente ancha, en la línea de la tipografía del
 * logotipo. Sus números tabulares son excelentes, que es lo que importa: en una
 * herramienta operativa el contenido más leído son cifras, y se leen de lejos.
 * Se cargan solo los pesos que se usan.
 */
const display = Archivo({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: BUSINESS.name,
    template: `%s · ${BUSINESS.name}`,
  },
  description: 'Entrenamiento semipersonalizado.',
  metadataBase: new URL(`https://${BUSINESS.domain}`),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Se permite ampliar: es un requisito de accesibilidad, no un descuido.
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f5' },
    { media: '(prefers-color-scheme: dark)', color: '#16130f' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${inter.variable} ${display.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
