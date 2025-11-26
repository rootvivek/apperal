'use client';

import { createContext, useCallback, useContext, useState, useEffect, useMemo } from 'react';
import type { User, AuthResponse, AuthContextType, AuthState } from '@/utils/auth/types';
import { useUserLoader } from '@/hooks/auth/useUserLoader';
import { useUserRealtime } from '@/hooks/auth/useUserRealtime';
// OTP utilities removed - using MSG91 widget default UI

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Hook for consuming auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user from localStorage and validate
  const { user: loadedUser, loading, banned, lastUserIdRef } = useUserLoader();

  // State management
  const [state, setState] = useState<AuthState>({
    user: loadedUser,
    loading,
    error: null,
    banned,
  });

  // Update state when loaded user changes
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      user: loadedUser,
      loading,
      banned,
    }));
  }, [loadedUser, loading, banned]);

  // Subscribe to realtime updates for user profile (deletion/deactivation)
  useUserRealtime({
    user: state.user,
    onUserDeleted: useCallback(() => {
      localStorage.removeItem('user');
      setState((prev) => ({
        ...prev,
        user: null,
        banned: { show: true, reason: 'deleted' },
      }));
    }, []),
    onUserDeactivated: useCallback(() => {
      localStorage.removeItem('user');
      setState((prev) => ({
        ...prev,
        user: null,
        banned: { show: true, reason: 'deactivated' },
      }));
    }, []),
  });

  // Login with MSG91 access token
  const handleLoginWithToken = useCallback(
    async (accessToken: string, phone?: string): Promise<AuthResponse> => {
      try {
        const response = await fetch('/api/auth/login-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken: accessToken,
            phone: phone, // Include phone if available
          }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          return {
            data: null,
            error: result.error || 'Failed to login',
          };
        }

        // Store user in localStorage
        if (typeof window !== 'undefined' && result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }

        // Update state
        if (result.user) {
          setState({
            user: result.user,
            loading: false,
            error: null,
            banned: { show: false, reason: '' },
          });
          lastUserIdRef.current = result.user.id;
        }

        return {
          data: { success: true, user: result.user },
          error: null,
        };
      } catch (error: any) {
        return {
          data: null,
          error: error?.message || 'Failed to login. Please try again.',
        };
      }
    },
    []
  );

  // Sign out handler
  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      setSigningOut(true);
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('user_id');
      }

      // Clear state
      setState({
        user: null,
        loading: false,
        error: null,
        banned: { show: false, reason: '' },
      });

      lastUserIdRef.current = null;

      // Redirect to home
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch {
      // Force cleanup on error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('user_id');
      }
      setState({
        user: null,
        loading: false,
        error: null,
        banned: { show: false, reason: '' },
      });
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } finally {
      setSigningOut(false);
    }
  }, []);

  // Context value
  const contextValue: AuthContextType = useMemo(
    () => ({
      user: state.user,
      loading: state.loading,
      error: state.error,
      banned: state.banned,
      signingOut,
      loginWithToken: handleLoginWithToken,
      signOut: handleSignOut,
    }),
    [state, signingOut, handleLoginWithToken, handleSignOut]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
