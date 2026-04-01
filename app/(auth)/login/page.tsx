'use client'

import { LoginForm } from '@/components/LoginForm'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()

  const handleLogin = async (email: string, password: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      return { success: false, error: 'Invalid email or password' }
    }

    router.push('/dashboard')
    return { success: true }
  }

  return (
    <LoginForm
      onLogin={handleLogin}
      onSwitchToSignup={() => router.push('/signup')}
    />
  )
}
