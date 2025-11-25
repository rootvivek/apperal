'use client';

import { createContext, useCallback, useContext, useState, useEffect, useMemo } from 'react';
import type { User, AuthResponse, AuthContextType, AuthState } from '@/utils/auth/types';
import { useUserLoader } from '@/hooks/auth/useUserLoader';
import { useUserRealtime } from '@/hooks/auth/useUserRealtime';
import { sendOTP as sendOTPUtil, verifyOTP as verifyOTPUtil } from '@/utils/auth/otpHandlers';

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

  // Send OTP handler - uses MSG91 widget (client-side)
  const handleSendOTP = useCallback(
    async (phone: string): Promise<AuthResponse> => {
      const result = await sendOTPUtil(phone);
      if (result.success) {
        return { data: { success: true }, error: null };
      }
      return {
        data: null,
        error: result.error || 'Failed to send OTP. Please try again.',
      };
    },
    []
  );

  // Verify OTP handler - calls API to verify and create/login user
  const handleVerifyOTP = useCallback(
    async (phone: string, token: string): Promise<AuthResponse> => {
      const result = await verifyOTPUtil(phone, token);
      
      if (!result.success) {
        return {
          data: null,
          error: result.error || 'Failed to verify OTP',
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
      sendOTP: handleSendOTP,
      verifyOTP: handleVerifyOTP,
      signOut: handleSignOut,
    }),
    [state, signingOut, handleSendOTP, handleVerifyOTP, handleSignOut]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
