import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { BUSINESS } from '@/config/placeholders'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
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
  // El diseño es mobile-first de verdad: se permite ampliar (accesibilidad).
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1917' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
