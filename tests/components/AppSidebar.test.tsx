import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pl } from '../../lib/i18n/pl'

// Mock next/navigation
const mockPathname = '/dashboard'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
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

// Mock i18n - default Polish
vi.mock('@/lib/i18n/context', () => {
  return {
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
  }
})

// Mock wallet context
vi.mock('@/lib/wallet/context', () => ({
  useWallet: () => ({
    wallets: [
      { id: 'w1', name: 'Osobisty', type: 'personal', role: 'owner', createdAt: '2026-01-01' },
      { id: 'w2', name: 'Domowy', type: 'shared', role: 'owner', createdAt: '2026-01-01' },
    ],
    activeWallet: { id: 'w1', name: 'Osobisty', type: 'personal', role: 'owner', createdAt: '2026-01-01' },
    setActiveWalletId: vi.fn(),
    refreshWallets: vi.fn(),
    loading: false,
  }),
}))

// Need to import after mocks
import { AppSidebar } from '@/components/AppSidebar'

describe('AppSidebar', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  it('renders the sidebar with navigation links in Polish', () => {
    render(<AppSidebar />)
    expect(screen.getByText('Portfello')).toBeInTheDocument()
    expect(screen.getByText('Panel główny')).toBeInTheDocument()
    expect(screen.getByText('Analityka')).toBeInTheDocument()
    expect(screen.getByText('Ustawienia')).toBeInTheDocument()
  })

  it('renders mobile menu toggle button', () => {
    render(<AppSidebar />)
    const toggle = screen.getByTestId('mobile-menu-toggle')
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-label', 'Open navigation menu')
  })

  it('sidebar starts off-screen (translated left) on mobile', () => {
    render(<AppSidebar />)
    const sidebar = screen.getByTestId('app-sidebar')
    expect(sidebar.className).toContain('-translate-x-full')
    expect(sidebar.className).toContain('md:translate-x-0')
  })

  it('opens sidebar when mobile toggle is clicked', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByTestId('mobile-menu-toggle'))

    const sidebar = screen.getByTestId('app-sidebar')
    expect(sidebar.className).toContain('translate-x-0')
    expect(sidebar.className).not.toContain('-translate-x-full')
  })

  it('shows backdrop overlay when sidebar is open', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('mobile-menu-toggle'))

    expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument()
  })

  it('closes sidebar when backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByTestId('mobile-menu-toggle'))
    expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument()

    await user.click(screen.getByTestId('sidebar-backdrop'))

    const sidebar = screen.getByTestId('app-sidebar')
    expect(sidebar.className).toContain('-translate-x-full')
    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()
  })

  it('closes sidebar when Escape key is pressed', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByTestId('mobile-menu-toggle'))
    expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    const sidebar = screen.getByTestId('app-sidebar')
    expect(sidebar.className).toContain('-translate-x-full')
  })

  it('closes sidebar when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByTestId('mobile-menu-toggle'))

    const closeButton = screen.getByLabelText('Close sidebar')
    await user.click(closeButton)

    const sidebar = screen.getByTestId('app-sidebar')
    expect(sidebar.className).toContain('-translate-x-full')
  })

  it('locks body scroll when sidebar is open', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByTestId('mobile-menu-toggle'))
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('')
  })

  it('displays user name and email', () => {
    render(<AppSidebar />)
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('renders logout button in Polish', () => {
    render(<AppSidebar />)
    expect(screen.getByText('Wyloguj')).toBeInTheDocument()
  })

  it('renders settings link', () => {
    render(<AppSidebar />)
    expect(screen.getByText('Ustawienia')).toBeInTheDocument()
  })
})
