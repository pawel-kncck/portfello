import { describe, it, expect } from 'vitest'
import { pl } from '@/lib/i18n/pl'
import { en } from '@/lib/i18n/en'

describe('i18n translation files', () => {
  it('Polish translations have all required keys', () => {
    expect(pl.common).toBeDefined()
    expect(pl.nav).toBeDefined()
    expect(pl.dashboard).toBeDefined()
    expect(pl.analytics).toBeDefined()
    expect(pl.expenses).toBeDefined()
    expect(pl.categories).toBeDefined()
    expect(pl.auth).toBeDefined()
    expect(pl.settings).toBeDefined()
  })

  it('English translations have all required keys', () => {
    expect(en.common).toBeDefined()
    expect(en.nav).toBeDefined()
    expect(en.dashboard).toBeDefined()
    expect(en.analytics).toBeDefined()
    expect(en.expenses).toBeDefined()
    expect(en.categories).toBeDefined()
    expect(en.auth).toBeDefined()
    expect(en.settings).toBeDefined()
  })

  it('Polish and English have matching structure', () => {
    const plKeys = getAllKeys(pl)
    const enKeys = getAllKeys(en)

    expect(plKeys).toEqual(enKeys)
  })

  it('Polish has correct default category translations', () => {
    expect(pl.categories.Food).toBe('Jedzenie')
    expect(pl.categories.Transport).toBe('Transport')
    expect(pl.categories.Shopping).toBe('Zakupy')
    expect(pl.categories.Other).toBe('Inne')
  })

  it('English has correct category translations', () => {
    expect(en.categories.Food).toBe('Food')
    expect(en.categories.Transport).toBe('Transport')
    expect(en.categories.Shopping).toBe('Shopping')
    expect(en.categories.Other).toBe('Other')
  })

  it('Polish is the intended default language', () => {
    // Verify Polish translations contain Polish text
    expect(pl.dashboard.welcomeBack).toBe('Witaj ponownie!')
    expect(pl.nav.dashboard).toBe('Panel glowny')
    expect(pl.nav.settings).toBe('Ustawienia')
  })

  it('currency formatting works with PLN', () => {
    const formatted = new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(123.45)

    expect(formatted).toContain('123')
    expect(formatted).toContain('45')
  })

  it('currency formatting works with USD', () => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(123.45)

    expect(formatted).toContain('$')
    expect(formatted).toContain('123.45')
  })
})

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (typeof value === 'object' && value !== null) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys.sort()
}
