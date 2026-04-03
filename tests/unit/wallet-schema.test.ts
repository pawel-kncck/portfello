import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Replicate the validation schemas from the API routes for testing
const createWalletSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 chars or less'),
})

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const expenseWithWalletSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().max(500).optional(),
  walletId: z.string().min(1, 'Wallet is required'),
})

describe('Wallet Schema Validation', () => {
  describe('createWalletSchema', () => {
    it('accepts a valid wallet name', () => {
      const result = createWalletSchema.safeParse({ name: 'Household' })
      expect(result.success).toBe(true)
    })

    it('rejects an empty name', () => {
      const result = createWalletSchema.safeParse({ name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects a name that is too long', () => {
      const result = createWalletSchema.safeParse({ name: 'a'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('rejects missing name field', () => {
      const result = createWalletSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('inviteMemberSchema', () => {
    it('accepts a valid email', () => {
      const result = inviteMemberSchema.safeParse({ email: 'user@example.com' })
      expect(result.success).toBe(true)
    })

    it('rejects an invalid email', () => {
      const result = inviteMemberSchema.safeParse({ email: 'not-an-email' })
      expect(result.success).toBe(false)
    })

    it('rejects empty email', () => {
      const result = inviteMemberSchema.safeParse({ email: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('expenseWithWalletSchema', () => {
    const validExpense = {
      amount: 42.50,
      category: 'Food',
      date: '2026-04-03',
      walletId: 'wallet-123',
    }

    it('accepts a valid expense with walletId', () => {
      const result = expenseWithWalletSchema.safeParse(validExpense)
      expect(result.success).toBe(true)
    })

    it('rejects expense without walletId', () => {
      const { walletId, ...noWallet } = validExpense
      const result = expenseWithWalletSchema.safeParse(noWallet)
      expect(result.success).toBe(false)
    })

    it('rejects expense with empty walletId', () => {
      const result = expenseWithWalletSchema.safeParse({ ...validExpense, walletId: '' })
      expect(result.success).toBe(false)
    })

    it('accepts expense with optional description', () => {
      const result = expenseWithWalletSchema.safeParse({ ...validExpense, description: 'Lunch' })
      expect(result.success).toBe(true)
    })

    it('rejects negative amount', () => {
      const result = expenseWithWalletSchema.safeParse({ ...validExpense, amount: -10 })
      expect(result.success).toBe(false)
    })

    it('rejects invalid date format', () => {
      const result = expenseWithWalletSchema.safeParse({ ...validExpense, date: '03-04-2026' })
      expect(result.success).toBe(false)
    })
  })
})
