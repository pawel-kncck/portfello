import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/Providers'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Portfello',
  description: 'Track your expenses and analyze your spending',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
