'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingOut: boolean;
  sendOTP: (phone: string) => Promise<any>;
  verifyOTP: (phone: string, token: string) => Promise<any>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const manualSignOutRef = useRef(false);
  const signingOutRef = useRef(false);
  const authSubscriptionRef = useRef<any>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    let isInitialized = false;

    // Check if we manually signed out (persisted in localStorage)
    const wasManualSignOut = localStorage.getItem('manual-sign-out') === 'true';
    
    if (wasManualSignOut) {
      setSession(null);
      setUser(null);
      setLoading(false);
      manualSignOutRef.current = true;
      localStorage.removeItem('manual-sign-out');
      setTimeout(() => {
        manualSignOutRef.current = false;
      }, 3000);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      isInitialized = true;
      manualSignOutRef.current = false;
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // If we manually signed out, ignore ALL auth state changes
      if (manualSignOutRef.current) {
        return;
      }
      
      // Additional check: if we're in the process of signing out, ignore everything
      if (signingOutRef.current) {
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Store subscription reference for potential cleanup
    authSubscriptionRef.current = subscription;

    return () => subscription.unsubscribe();
  }, []);

  const sendOTP = async (phone: string) => {
    try {
      localStorage.removeItem('manual-sign-out');
      manualSignOutRef.current = false;
      
      console.log('Sending OTP to phone:', phone);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
        options: {
          channel: 'sms'
        }
      });
      
      console.log('OTP response:', { data, error });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('OTP send error:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.status === 422) {
        errorMessage = 'Invalid phone number format. Please use international format (e.g., +1234567890)';
      } else if (error.message?.includes('Invalid phone number')) {
        errorMessage = 'Please enter a valid phone number with country code';
      } else if (error.message?.includes('SMS')) {
        errorMessage = 'SMS service temporarily unavailable. Please try again later.';
      }
      
      return { data: null, error: errorMessage };
    }
  };

  const verifyOTP = async (phone: string, token: string) => {
    try {
      localStorage.removeItem('manual-sign-out');
      manualSignOutRef.current = false;
      
      console.log('Verifying OTP for phone:', phone, 'token:', token);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: token.trim(),
        type: 'sms'
      });
      
      console.log('OTP verification response:', { data, error });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('OTP verification error:', error);
      return { data: null, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      setSigningOut(true);
      signingOutRef.current = true;
      manualSignOutRef.current = true;
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setLoading(false);
      
      // Clear localStorage FIRST
      localStorage.setItem('manual-sign-out', 'true');
      
      // Clear all Supabase auth tokens
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Unsubscribe from auth listener
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
      
      // Try Supabase sign out (non-blocking)
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // Continue even if Supabase sign out fails
      }
      
      // Force redirect immediately
      window.location.replace('/');
      
    } catch (error) {
      // Force logout even if there's an error
      setUser(null);
      setSession(null);
      localStorage.setItem('manual-sign-out', 'true');
      window.location.replace('/');
    }
  };

  const signInWithGoogle = async () => {
    localStorage.removeItem('manual-sign-out');
    manualSignOutRef.current = false;
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signInWithFacebook = async () => {
    localStorage.removeItem('manual-sign-out');
    manualSignOutRef.current = false;
    
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const value = {
    user,
    session,
    loading,
    signingOut,
    sendOTP,
    verifyOTP,
    signOut,
    signInWithGoogle,
    signInWithFacebook,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}