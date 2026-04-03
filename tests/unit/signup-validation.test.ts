import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Mirror the schema from app/(auth)/signup/action.ts
// to test validation logic without importing the server action
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

describe('signup validation', () => {
  it('accepts valid input', () => {
    const result = signupSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = signupSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0].message).toBe('Invalid email address')
  })

  it('rejects short password', () => {
    const result = signupSchema.safeParse({
      email: 'test@example.com',
      password: '1234567',
    })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0].message).toBe(
      'Password must be at least 8 characters',
    )
  })
})
