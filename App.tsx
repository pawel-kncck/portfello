import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { Dashboard } from './components/DashboardPage';
import { Analytics } from './components/AnalyticsPage';
import { Sidebar } from './components/Sidebar';
import { Loader2 } from 'lucide-react';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

type AuthView = 'login' | 'signup';
type AppView = 'dashboard' | 'analytics';

interface User {
  id: string;
  email: string;
  user_metadata: {
    name: string;
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [accessToken, setAccessToken] = useState<string>('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.user && session?.access_token) {
        setUser(session.user as User);
        setAccessToken(session.access_token);
      }
    } catch (error) {
      console.log('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b4e89827/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // After successful registration, log the user in
      const { data: loginData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (loginData.session?.user && loginData.session?.access_token) {
        setUser(loginData.session.user as User);
        setAccessToken(loginData.session.access_token);
      }
      
      return { success: true };
    } catch (error: any) {
      console.log('Signup error:', error);
      return { success: false, error: error.message };
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (session?.user && session?.access_token) {
        setUser(session.user as User);
        setAccessToken(session.access_token);
      }
      
      return { success: true };
    } catch (error: any) {
      console.log('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAccessToken('');
      setCurrentView('dashboard');
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl tracking-tight text-gray-900">
              Expense Tracker
            </h1>
            <p className="mt-2 text-gray-600">
              Track your expenses and analyze your spending
            </p>
          </div>
          
          {authView === 'login' ? (
            <LoginForm 
              onLogin={handleLogin}
              onSwitchToSignup={() => setAuthView('signup')}
            />
          ) : (
            <SignupForm 
              onSignup={handleSignup}
              onSwitchToLogin={() => setAuthView('login')}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        user={user}
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentView === 'dashboard' ? (
            <Dashboard user={user} accessToken={accessToken} />
          ) : (
            <Analytics user={user} accessToken={accessToken} />
          )}
        </div>
      </main>
    </div>
  );
}