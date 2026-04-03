import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pl } from '../../lib/i18n/pl'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { name: 'Test User', email: 'test@example.com' },
    },
  }),
  signOut: vi.fn(),
}))

// Mock i18n
vi.mock('@/lib/i18n/context', () => ({
  useI18n: () => ({
    t: pl,
    language: 'pl',
    currency: 'PLN',
    setLanguage: vi.fn(),
    setCurrency: vi.fn(),
    formatCurrency: (amount: number) => `${amount.toFixed(2)} zl`,
    formatDate: (date: string) => date,
    formatMonthYear: (date: string) => date,
    saveSettings: vi.fn(),
    settingsLoaded: true,
  }),
}))

const mockSetActiveWalletId = vi.fn()
const mockRefreshWallets = vi.fn()

const mockWallets = [
  { id: 'w1', name: 'Osobisty', type: 'personal' as const, role: 'owner' as const, createdAt: '2026-01-01' },
  { id: 'w2', name: 'Domowy', type: 'shared' as const, role: 'owner' as const, createdAt: '2026-01-01' },
  { id: 'w3', name: 'Firma', type: 'shared' as const, role: 'member' as const, createdAt: '2026-01-01' },
]

vi.mock('@/lib/wallet/context', () => ({
  useWallet: () => ({
    wallets: mockWallets,
    activeWallet: mockWallets[0],
    setActiveWalletId: mockSetActiveWalletId,
    refreshWallets: mockRefreshWallets,
    loading: false,
  }),
}))

import { AppSidebar } from '@/components/AppSidebar'

describe('Wallet Switcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.style.overflow = ''
  })

  it('renders the wallet switcher with active wallet name', () => {
    render(<AppSidebar />)
    expect(screen.getByTestId('wallet-switcher')).toBeInTheDocument()
    expect(screen.getByText('Osobisty')).toBeInTheDocument()
  })

  it('shows "Moje portfele" section label', () => {
    render(<AppSidebar />)
    expect(screen.getByText('Moje portfele')).toBeInTheDocument()
  })

  it('opens wallet dropdown when switcher is clicked', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    expect(screen.queryByTestId('wallet-dropdown')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('wallet-switcher'))

    expect(screen.getByTestId('wallet-dropdown')).toBeInTheDocument()
  })

  it('shows all wallets in the dropdown', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByTestId('wallet-switcher'))

    // All three wallets should be visible in dropdown
    const dropdown = screen.getByTestId('wallet-dropdown')
    expect(dropdown).toHaveTextContent('Osobisty')
    expect(dropdown).toHaveTextContent('Domowy')
    expect(dropdown).toHaveTextContent('Firma')
  })

  it('shows shared badge for shared wallets in dropdown', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByTestId('wallet-switcher'))

    // The shared wallets should show the "Wspolny" badge
    const sharedBadges = screen.getAllByText('Wspolny')
    expect(sharedBadges.length).toBeGreaterThanOrEqual(2) // Domowy and Firma
  })

  it('calls setActiveWalletId when a wallet is selected', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByTestId('wallet-switcher'))

    // Click on "Domowy" wallet
    const dropdown = screen.getByTestId('wallet-dropdown')
    const domowyButton = Array.from(dropdown.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('Domowy')
    )
    expect(domowyButton).toBeTruthy()
    await user.click(domowyButton!)

    expect(mockSetActiveWalletId).toHaveBeenCalledWith('w2')
  })

  it('shows create wallet button in dropdown', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByTestId('wallet-switcher'))

    expect(screen.getByTestId('create-wallet-button')).toBeInTheDocument()
    expect(screen.getByText('Utworz portfel')).toBeInTheDocument()
  })

  it('shows inline create wallet form when create button is clicked', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByTestId('wallet-switcher'))
    await user.click(screen.getByTestId('create-wallet-button'))

    expect(screen.getByTestId('create-wallet-input')).toBeInTheDocument()
  })

  it('hides create form when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByTestId('wallet-switcher'))
    await user.click(screen.getByTestId('create-wallet-button'))

    expect(screen.getByTestId('create-wallet-input')).toBeInTheDocument()

    await user.click(screen.getByText('Anuluj'))

    expect(screen.queryByTestId('create-wallet-input')).not.toBeInTheDocument()
  })
})
