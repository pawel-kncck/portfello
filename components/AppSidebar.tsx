'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { BarChart3, Home, LogOut, User } from 'lucide-react'

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userName = session?.user?.name || 'User'
  const userEmail = session?.user?.email || ''

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
      <div className="flex flex-col h-full">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 rounded-lg p-2">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl text-gray-900">Portfello</h1>
            </div>
          </div>
        </div>

        <Separator />

        <nav className="flex-1 px-4 py-6 space-y-2">
          <Button
            variant={pathname === '/dashboard' ? 'default' : 'ghost'}
            className="w-full justify-start"
            asChild
          >
            <Link href="/dashboard">
              <Home className="mr-3 h-4 w-4" />
              Dashboard
            </Link>
          </Button>

          <Button
            variant={pathname === '/analytics' ? 'default' : 'ghost'}
            className="w-full justify-start"
            asChild
          >
            <Link href="/analytics">
              <BarChart3 className="mr-3 h-4 w-4" />
              Analytics
            </Link>
          </Button>
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gray-100 rounded-full p-2">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
