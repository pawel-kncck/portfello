import React from 'react'
import { Button } from './ui/button'
import { LogOut, BarChart3, Home } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  activeTab: 'dashboard' | 'analytics'
  onTabChange: (tab: 'dashboard' | 'analytics') => void
  onLogout: () => void
  userName: string
}

export function Layout({ children, activeTab, onTabChange, onLogout, userName }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <div className="text-xl font-semibold text-gray-900">ExpenseTracker</div>
              </div>
              
              <nav className="flex space-x-1">
                <Button
                  variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                  onClick={() => onTabChange('dashboard')}
                  className="flex items-center space-x-2"
                >
                  <Home size={18} />
                  <span>Dashboard</span>
                </Button>
                <Button
                  variant={activeTab === 'analytics' ? 'default' : 'ghost'}
                  onClick={() => onTabChange('analytics')}
                  className="flex items-center space-x-2"
                >
                  <BarChart3 size={18} />
                  <span>Analytics</span>
                </Button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {userName}</span>
              <Button
                variant="ghost"
                onClick={onLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}