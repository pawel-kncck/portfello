'use client'

import { AppSidebar } from '@/components/AppSidebar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AppSidebar />
      <main className="flex-1 ml-0 md:ml-64">
        <div className="max-w-7xl mx-auto px-4 pt-16 md:pt-8 sm:px-6 lg:px-8 pb-8">
          {children}
        </div>
      </main>
    </div>
  )
}
