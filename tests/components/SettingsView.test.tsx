import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pl } from '../../lib/i18n/pl'

const mockSaveSettings = vi.fn().mockResolvedValue({ success: true })
const mockSetLanguage = vi.fn()
const mockSetCurrency = vi.fn()

vi.mock('@/lib/i18n/context', () => {
  return {
    useI18n: () => ({
      t: pl,
      language: 'pl',
      currency: 'PLN',
      setLanguage: mockSetLanguage,
      setCurrency: mockSetCurrency,
      formatCurrency: (amount: number) => `${amount.toFixed(2)} zl`,
      formatDate: (date: string) => date,
      formatMonthYear: (date: string) => date,
      saveSettings: mockSaveSettings,
      settingsLoaded: true,
    }),
  }
})

import { SettingsView } from '@/components/SettingsView'

describe('SettingsView', () => {
  it('renders settings page title in Polish', () => {
    render(<SettingsView />)
    expect(screen.getByText('Ustawienia')).toBeInTheDocument()
    expect(screen.getByText('Zarządzaj preferencjami aplikacji')).toBeInTheDocument()
  })

  it('renders language and currency sections', () => {
    render(<SettingsView />)
    expect(screen.getByText('Język')).toBeInTheDocument()
    expect(screen.getByText('Waluta')).toBeInTheDocument()
  })

  it('renders save button', () => {
    render(<SettingsView />)
    expect(screen.getByText('Zapisz')).toBeInTheDocument()
  })

  it('calls saveSettings when save button is clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)

    await user.click(screen.getByText('Zapisz'))

    expect(mockSaveSettings).toHaveBeenCalled()
  })

  it('shows success message after saving', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)

    await user.click(screen.getByText('Zapisz'))

    expect(await screen.findByText('Zapisano ustawienia')).toBeInTheDocument()
  })

  it('shows error message when save fails', async () => {
    mockSaveSettings.mockResolvedValueOnce({ success: false })
    const user = userEvent.setup()
    render(<SettingsView />)

    await user.click(screen.getByText('Zapisz'))

    expect(await screen.findByText('Nie udało się zapisać ustawień')).toBeInTheDocument()
  })
})
