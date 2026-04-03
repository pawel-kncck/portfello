import type { pl } from './pl'

// Use a deep string mapping to avoid literal type mismatches between translations
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>
}

export type Translations = DeepStringify<typeof pl>
export type Language = 'pl' | 'en'
export type Currency = 'PLN' | 'USD'
