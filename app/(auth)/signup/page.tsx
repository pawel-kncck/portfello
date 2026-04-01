'use client'

import { SignupForm } from '@/components/SignupForm'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { signup } from './action'

export default function SignupPage() {
  const router = useRouter()

  const handleSignup = async (email: string, password: string, name: string) => {
    const result = await signup(email, password, name)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Auto-login after successful registration
    const signInResult = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (signInResult?.error) {
      return { success: false, error: 'Account created but login failed. Please sign in manually.' }
    }

    router.push('/dashboard')
    return { success: true }
  }

  return (
    <SignupForm
      onSignup={handleSignup}
      onSwitchToLogin={() => router.push('/login')}
    />
  )
}
