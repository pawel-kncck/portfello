import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Track your expenses and analyze your spending',
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
