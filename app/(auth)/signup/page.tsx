'use client'

import { SignupForm } from '@/components/SignupForm'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()

  // TODO: Replace with Auth.js registration (Step 3)
  const handleSignup = async (email: string, password: string, name: string) => {
    console.log('Signup stub:', email, name)
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
