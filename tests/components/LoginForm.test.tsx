import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/LoginForm'

describe('LoginForm', () => {
  const defaultProps = {
    onLogin: vi.fn().mockResolvedValue({ success: true }),
    onSwitchToSignup: vi.fn(),
  }

  it('renders email and password fields', () => {
    render(<LoginForm {...defaultProps} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<LoginForm {...defaultProps} />)
    const submitBtn = screen.getByRole('button', { name: 'Sign In' })
    expect(submitBtn).toHaveAttribute('type', 'submit')
  })

  it('calls onLogin with email and password on submit', async () => {
    const onLogin = vi.fn().mockResolvedValue({ success: true })
    const user = userEvent.setup()

    render(<LoginForm {...defaultProps} onLogin={onLogin} />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(onLogin).toHaveBeenCalledWith('test@example.com', 'password123')
  })

  it('displays error message on login failure', async () => {
    const onLogin = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'Invalid credentials' })
    const user = userEvent.setup()

    render(<LoginForm {...defaultProps} onLogin={onLogin} />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })

  it('calls onSwitchToSignup when sign up link is clicked', async () => {
    const onSwitchToSignup = vi.fn()
    const user = userEvent.setup()

    render(<LoginForm {...defaultProps} onSwitchToSignup={onSwitchToSignup} />)

    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(onSwitchToSignup).toHaveBeenCalled()
  })
})
