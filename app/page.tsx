import { redirect } from 'next/navigation'

export default function Home() {
  // TODO: Check auth session and redirect accordingly (Step 3)
  redirect('/login')
}
