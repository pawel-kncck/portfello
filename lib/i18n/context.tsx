'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { pl } from './pl'
import { en } from './en'
import type { Translations, Language, Currency } from './types'

interface I18nContextType {
  t: Translations
  language: Language
  currency: Currency
  setLanguage: (lang: Language) => void
  setCurrency: (cur: Currency) => void
  formatCurrency: (amount: number) => string
  formatDate: (date: string | Date) => string
  formatMonthYear: (date: string | Date) => string
  saveSettings: () => Promise<{ success: boolean }>
  settingsLoaded: boolean
}

const translations: Record<Language, Translations> = { pl, en }

const localeMap: Record<Language, string> = {
  pl: 'pl-PL',
  en: 'en-US',
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('pl')
  const [currency, setCurrency] = useState<Currency>('PLN')
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          if (data.language) setLanguage(data.language as Language)
          if (data.currency) setCurrency(data.currency as Currency)
        }
      } catch {
        // Use defaults (Polish)
      } finally {
        setSettingsLoaded(true)
      }
    }
    loadSettings()
  }, [])

  const t = translations[language]
  const locale = localeMap[language]

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount)
  }, [locale, currency])

  const formatDate = useCallback((date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString(locale)
  }, [locale])

  const formatMonthYear = useCallback((date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'long' })
  }, [locale])

  const saveSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, currency }),
      })
      return { success: res.ok }
    } catch {
      return { success: false }
    }
  }, [language, currency])

  return (
    <I18nContext.Provider value={{
      t,
      language,
      currency,
      setLanguage,
      setCurrency,
      formatCurrency,
      formatDate,
      formatMonthYear,
      saveSettings,
      settingsLoaded,
    }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
