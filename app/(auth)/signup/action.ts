'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/schema'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

interface SignupResult {
  success: boolean
  error?: string
}

export async function signup(email: string, password: string): Promise<SignupResult> {
  const parsed = signupSchema.safeParse({ email, password })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    })
    if (existing) {
      return { success: false, error: 'Unable to create account. Please try again.' }
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)

    await db.insert(users).values({
      email: parsed.data.email,
      passwordHash,
    })

    return { success: true }
  } catch (error) {
    console.error('Signup error:', error)
    return { success: false, error: 'Unable to create account. Please try again.' }
  }
}
