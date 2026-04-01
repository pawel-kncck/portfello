'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

interface SignupResult {
  success: boolean
  error?: string
}

export async function signup(email: string, password: string, name: string): Promise<SignupResult> {
  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return { success: false, error: 'An account with this email already exists' }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: { email, name, passwordHash },
    })

    return { success: true }
  } catch (error) {
    console.error('Signup error:', error)
    return { success: false, error: 'Failed to create account' }
  }
}
