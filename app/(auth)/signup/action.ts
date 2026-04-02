'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
})

interface SignupResult {
  success: boolean
  error?: string
}

export async function signup(email: string, password: string, name: string): Promise<SignupResult> {
  const parsed = signupSchema.safeParse({ email, password, name })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (existing) {
      return { success: false, error: 'Unable to create account. Please try again.' }
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)

    await prisma.user.create({
      data: { email: parsed.data.email, name: parsed.data.name, passwordHash },
    })

    return { success: true }
  } catch (error) {
    console.error('Signup error:', error)
    return { success: false, error: 'Unable to create account. Please try again.' }
  }
}
