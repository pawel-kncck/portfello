'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'

export interface Wallet {
  id: string
  name: string
  type: 'personal' | 'shared'
  role: 'owner' | 'member'
  createdAt: string
}

interface WalletContextValue {
  wallets: Wallet[]
  activeWallet: Wallet | null
  setActiveWalletId: (id: string) => void
  refreshWallets: () => Promise<void>
  loading: boolean
}

const WalletContext = createContext<WalletContextValue>({
  wallets: [],
  activeWallet: null,
  setActiveWalletId: () => {},
  refreshWallets: async () => {},
  loading: true,
})

const ACTIVE_WALLET_KEY = 'portfello-active-wallet-id'

export function WalletProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [activeWalletId, setActiveWalletIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchWallets = useCallback(async () => {
    try {
      const res = await fetch('/api/wallets')
      if (res.ok) {
        const data = await res.json()
        const fetchedWallets: Wallet[] = data.wallets || []
        setWallets(fetchedWallets)

        // Restore or default active wallet
        const storedId = localStorage.getItem(ACTIVE_WALLET_KEY)
        const storedExists = fetchedWallets.some((w) => w.id === storedId)

        if (storedExists) {
          setActiveWalletIdState(storedId)
        } else if (fetchedWallets.length > 0) {
          // Default to the personal wallet, or first wallet
          const personal = fetchedWallets.find((w) => w.type === 'personal')
          const defaultId = personal ? personal.id : fetchedWallets[0].id
          setActiveWalletIdState(defaultId)
          localStorage.setItem(ACTIVE_WALLET_KEY, defaultId)
        }
      }
    } catch (error) {
      console.log('Error fetching wallets:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWallets()
    } else if (status === 'unauthenticated') {
      setWallets([])
      setActiveWalletIdState(null)
      setLoading(false)
    }
  }, [status, fetchWallets])

  const setActiveWalletId = useCallback((id: string) => {
    setActiveWalletIdState(id)
    localStorage.setItem(ACTIVE_WALLET_KEY, id)
  }, [])

  const activeWallet = wallets.find((w) => w.id === activeWalletId) || null

  return (
    <WalletContext.Provider value={{ wallets, activeWallet, setActiveWalletId, refreshWallets: fetchWallets, loading }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
