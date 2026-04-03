import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pl } from '../../lib/i18n/pl'

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

import { LoginForm } from '@/components/LoginForm'

describe('LoginForm', () => {
  const defaultProps = {
    onLogin: vi.fn().mockResolvedValue({ success: true }),
    onSwitchToSignup: vi.fn(),
  }

  it('renders email and password fields in Polish', () => {
    render(<LoginForm {...defaultProps} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Haslo')).toBeInTheDocument()
  })

  it('renders submit button in Polish', () => {
    render(<LoginForm {...defaultProps} />)
    const submitBtn = screen.getByRole('button', { name: 'Zaloguj sie' })
    expect(submitBtn).toHaveAttribute('type', 'submit')
  })

  it('calls onLogin with email and password on submit', async () => {
    const onLogin = vi.fn().mockResolvedValue({ success: true })
    const user = userEvent.setup()

    render(<LoginForm {...defaultProps} onLogin={onLogin} />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Haslo'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Zaloguj sie' }))

    expect(onLogin).toHaveBeenCalledWith('test@example.com', 'password123')
  })

  it('displays error message on login failure', async () => {
    const onLogin = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'Nieprawidlowe dane' })
    const user = userEvent.setup()

    render(<LoginForm {...defaultProps} onLogin={onLogin} />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Haslo'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Zaloguj sie' }))

    expect(await screen.findByText('Nieprawidlowe dane')).toBeInTheDocument()
  })

  it('calls onSwitchToSignup when sign up link is clicked', async () => {
    const onSwitchToSignup = vi.fn()
    const user = userEvent.setup()

    render(<LoginForm {...defaultProps} onSwitchToSignup={onSwitchToSignup} />)

    await user.click(screen.getByRole('button', { name: 'Zarejestruj sie' }))

    expect(onSwitchToSignup).toHaveBeenCalled()
  })
})
