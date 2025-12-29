'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  industry_id: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isEmbedded: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
  company_name?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

// Allowed parent origins for postMessage auth
const ALLOWED_PARENT_ORIGINS = [
  'https://sealn-super-site.vercel.app',
  'http://localhost:3000',
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authProcessed = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check if running in embedded mode
  const isEmbedded = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embedded') === 'true';

  // Authenticate using token from parent
  const authenticateWithToken = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/auth/parent-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_token: token }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return true;
      } else {
        console.error('Token auth failed:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Token auth error:', error);
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle postMessage auth from parent window
  useEffect(() => {
    if (!isEmbedded) return;

    const handleMessage = async (event: MessageEvent) => {
      // Validate origin
      if (!ALLOWED_PARENT_ORIGINS.includes(event.origin)) {
        return;
      }

      // Handle auth token from parent
      if (event.data?.type === 'AUTH_TOKEN' && !authProcessed.current) {
        authProcessed.current = true;
        const success = await authenticateWithToken(event.data.token);
        if (success) {
          // Confirm auth to parent
          window.parent.postMessage({ type: 'AUTH_CONFIRMED' }, event.origin);
          setLoading(false);
        } else {
          await refreshUser();
        }
      }

      // Handle token refresh
      if (event.data?.type === 'AUTH_TOKEN_REFRESH') {
        await authenticateWithToken(event.data.token);
      }
    };

    window.addEventListener('message', handleMessage);

    // Signal to parent that we're ready for auth
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'EMBEDDED_APP_READY' }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [isEmbedded, authenticateWithToken, refreshUser]);

  // Handle initial authentication (non-embedded or fallback)
  useEffect(() => {
    const initAuth = async () => {
      if (isEmbedded) {
        // In embedded mode, wait for postMessage auth with timeout fallback
        const timeout = setTimeout(async () => {
          if (!authProcessed.current) {
            await refreshUser();
          }
        }, 3000);
        return () => clearTimeout(timeout);
      } else {
        // Normal session check for standalone mode
        await refreshUser();
      }
    };

    initAuth();
  }, [isEmbedded, refreshUser]);

  // Redirect to login if not authenticated and on protected route
  // Skip redirect when embedded in another app
  useEffect(() => {
    if (!loading && !user && !PUBLIC_ROUTES.includes(pathname) && !isEmbedded) {
      router.push('/login');
    }
  }, [user, loading, pathname, router, isEmbedded]);

  // Redirect to dashboard if authenticated and on public route
  useEffect(() => {
    if (!loading && user && PUBLIC_ROUTES.includes(pathname)) {
      router.push('/');
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      setUser(data.user);
      router.push('/');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (registerData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setUser(data.user);
      router.push('/');
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isEmbedded, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
