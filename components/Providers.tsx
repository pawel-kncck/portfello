'use client'

import { SessionProvider } from 'next-auth/react'
import { I18nProvider } from '@/lib/i18n/context'
import { WalletProvider } from '@/lib/wallet/context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <WalletProvider>{children}</WalletProvider>
      </I18nProvider>
    </SessionProvider>
  )
}
