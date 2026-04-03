import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pl } from '../../lib/i18n/pl'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/wallet-settings',
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

// Use a stable reference for activeWallet
const stableWallet = { id: 'w1', name: 'Osobisty', type: 'personal' as const, role: 'owner' as const, createdAt: '2026-01-01' }

vi.mock('@/lib/wallet/context', () => ({
  useWallet: () => ({
    wallets: [stableWallet],
    activeWallet: stableWallet,
    setActiveWalletId: vi.fn(),
    refreshWallets: vi.fn(),
  }),
}))

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation(async () => ({
    ok: true,
    json: async () => ({ categories: [], flat: [], tags: [], rules: [] }),
  }))
})

// Import after mocks
import { WalletSettingsView } from '../../components/WalletSettingsView'

describe('WalletSettingsView', () => {
  it('renders the wallet settings title', async () => {
    render(<WalletSettingsView />)
    expect(screen.getByText(pl.walletSettings.title)).toBeInTheDocument()
  })

  it('shows the active wallet name', async () => {
    render(<WalletSettingsView />)
    expect(screen.getByText(/Osobisty/)).toBeInTheDocument()
  })

  it('renders all three tab buttons', async () => {
    render(<WalletSettingsView />)
    expect(screen.getByText(pl.walletSettings.categoriesTab)).toBeInTheDocument()
    expect(screen.getByText(pl.walletSettings.tagsTab)).toBeInTheDocument()
    expect(screen.getByText(pl.walletSettings.rulesTab)).toBeInTheDocument()
  })

  it('shows categories tab by default', async () => {
    render(<WalletSettingsView />)
    expect(await screen.findByText(pl.categoryManagement.noCategories)).toBeInTheDocument()
  })

  it('switches to tags tab on click', async () => {
    const user = userEvent.setup()
    render(<WalletSettingsView />)

    // Wait for categories to load first
    await screen.findByText(pl.categoryManagement.noCategories)

    await user.click(screen.getByText(pl.walletSettings.tagsTab))
    expect(await screen.findByText(pl.tagManagement.noTags)).toBeInTheDocument()
  })

  it('switches to rules tab on click', async () => {
    const user = userEvent.setup()
    render(<WalletSettingsView />)

    // Wait for categories to load first
    await screen.findByText(pl.categoryManagement.noCategories)

    await user.click(screen.getByText(pl.walletSettings.rulesTab))
    expect(await screen.findByText(pl.ruleManagement.noRules)).toBeInTheDocument()
  })

  it('fetches categories on mount', async () => {
    render(<WalletSettingsView />)
    await screen.findByText(pl.categoryManagement.noCategories)
    expect(mockFetch).toHaveBeenCalledWith('/api/wallets/w1/categories')
  })

  it('shows add category button', async () => {
    render(<WalletSettingsView />)
    await screen.findByText(pl.categoryManagement.noCategories)
    expect(screen.getByText(pl.categoryManagement.addCategory)).toBeInTheDocument()
  })

  it('shows add tag button when on tags tab', async () => {
    const user = userEvent.setup()
    render(<WalletSettingsView />)

    await screen.findByText(pl.categoryManagement.noCategories)
    await user.click(screen.getByText(pl.walletSettings.tagsTab))
    await screen.findByText(pl.tagManagement.noTags)
    expect(screen.getByText(pl.tagManagement.addTag)).toBeInTheDocument()
  })

  it('shows add rule button when on rules tab', async () => {
    const user = userEvent.setup()
    render(<WalletSettingsView />)

    await screen.findByText(pl.categoryManagement.noCategories)
    await user.click(screen.getByText(pl.walletSettings.rulesTab))
    await screen.findByText(pl.ruleManagement.noRules)
    expect(screen.getByText(pl.ruleManagement.addRule)).toBeInTheDocument()
  })
})
