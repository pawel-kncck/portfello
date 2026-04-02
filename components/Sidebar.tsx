import React from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { BarChart3, Home, LogOut, User } from 'lucide-react';

interface User {
  id: string;
  email: string;
  user_metadata: {
    name: string;
  };
}

interface SidebarProps {
  user: User;
  currentView: 'dashboard' | 'analytics';
  onViewChange: (view: 'dashboard' | 'analytics') => void;
  onLogout: () => void;
}

export function Sidebar({ user, currentView, onViewChange, onLogout }: SidebarProps) {
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
            variant={currentView === 'dashboard' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onViewChange('dashboard')}
          >
            <Home className="mr-3 h-4 w-4" />
            Dashboard
          </Button>
          
          <Button
            variant={currentView === 'analytics' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onViewChange('analytics')}
          >
            <BarChart3 className="mr-3 h-4 w-4" />
            Analytics
          </Button>
        </nav>
        
        <div className="p-4 border-t">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gray-100 rounded-full p-2">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">
                {user.user_metadata?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}