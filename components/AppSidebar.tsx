'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { BarChart3, Home, LogOut, Menu, Settings, User, X, Wallet, ChevronDown, Plus } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { useWallet } from '@/lib/wallet/context'

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { t } = useI18n()
  const { wallets, activeWallet, setActiveWalletId, refreshWallets } = useWallet()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false)
  const [showCreateWallet, setShowCreateWallet] = useState(false)
  const [newWalletName, setNewWalletName] = useState('')
  const [creatingWallet, setCreatingWallet] = useState(false)

  const userName = session?.user?.name || 'User'
  const userEmail = session?.user?.email || ''

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    if (mobileOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [mobileOpen])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [mobileOpen])

  const toggleMobile = useCallback(() => {
    setMobileOpen(prev => !prev)
  }, [])

  const handleCreateWallet = async () => {
    if (!newWalletName.trim()) return
    setCreatingWallet(true)
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWalletName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        await refreshWallets()
        setActiveWalletId(data.wallet.id)
        setNewWalletName('')
        setShowCreateWallet(false)
      }
    } catch (error) {
      console.log('Error creating wallet:', error)
    } finally {
      setCreatingWallet(false)
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-500 rounded-lg p-2">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl text-gray-900">Portfello</h1>
          </div>
        </div>
        {/* Close button - visible only on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-2 -mr-2 text-gray-500 hover:text-gray-700 rounded-md"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <Separator />

      {/* Wallet Switcher */}
      <div className="px-4 py-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t.wallets.myWallets}</p>
        <button
          onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          data-testid="wallet-switcher"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <Wallet className="h-4 w-4 text-gray-500 shrink-0" />
            <span className="text-sm text-gray-900 truncate">
              {activeWallet?.name || t.common.loading}
            </span>
            {activeWallet?.type === 'shared' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">
                {t.wallets.shared}
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${walletDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {walletDropdownOpen && (
          <div className="mt-1 bg-white border rounded-lg shadow-lg overflow-hidden" data-testid="wallet-dropdown">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => {
                  setActiveWalletId(wallet.id)
                  setWalletDropdownOpen(false)
                }}
                className={`w-full flex items-center space-x-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  wallet.id === activeWallet?.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <Wallet className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{wallet.name}</span>
                {wallet.type === 'shared' && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded shrink-0">
                    {t.wallets.shared}
                  </span>
                )}
              </button>
            ))}
            <Separator />
            {showCreateWallet ? (
              <div className="p-2 space-y-2">
                <input
                  type="text"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWallet()}
                  placeholder={t.wallets.walletNamePlaceholder}
                  className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  data-testid="create-wallet-input"
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={handleCreateWallet}
                    disabled={creatingWallet || !newWalletName.trim()}
                  >
                    {creatingWallet ? t.wallets.creating : t.wallets.createWallet}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => { setShowCreateWallet(false); setNewWalletName('') }}
                  >
                    {t.common.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateWallet(true)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                data-testid="create-wallet-button"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t.wallets.createWallet}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <Separator />

      <nav className="flex-1 px-4 py-6 space-y-2">
        <Button
          variant={pathname === '/dashboard' ? 'default' : 'ghost'}
          className="w-full justify-start"
          asChild
        >
          <Link href="/dashboard">
            <Home className="mr-3 h-4 w-4" />
            {t.nav.dashboard}
          </Link>
        </Button>

        <Button
          variant={pathname === '/analytics' ? 'default' : 'ghost'}
          className="w-full justify-start"
          asChild
        >
          <Link href="/analytics">
            <BarChart3 className="mr-3 h-4 w-4" />
            {t.nav.analytics}
          </Link>
        </Button>

        <Button
          variant={pathname === '/settings' ? 'default' : 'ghost'}
          className="w-full justify-start"
          asChild
        >
          <Link href="/settings">
            <Settings className="mr-3 h-4 w-4" />
            {t.nav.settings}
          </Link>
        </Button>
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-gray-100 rounded-full p-2">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="mr-3 h-4 w-4" />
          {t.nav.logout}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleMobile}
        className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md rounded-lg p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
        aria-label="Open navigation menu"
        data-testid="mobile-menu-toggle"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}

      {/* Sidebar - desktop: always visible; mobile: slide-in drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg
          transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        data-testid="app-sidebar"
      >
        {sidebarContent}
      </div>
    </>
  )
}
