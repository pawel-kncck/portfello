'use client'

import { LoginForm } from '@/components/LoginForm'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  // TODO: Replace with Auth.js signIn (Step 3)
  const handleLogin = async (email: string, password: string) => {
    console.log('Login stub:', email)
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
