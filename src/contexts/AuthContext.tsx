'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingOut: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
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
    console.log('🔍 Initial load check:', { wasManualSignOut, manualSignOutRef: manualSignOutRef.current });
    
    if (wasManualSignOut) {
      console.log('🚫 Manual sign out detected, clearing auth state and skipping ALL auth setup');
      setSession(null);
      setUser(null);
      setLoading(false);
      manualSignOutRef.current = true;
      // Clear the flag immediately but keep the ref for longer to prevent auto-login
      localStorage.removeItem('manual-sign-out');
      setTimeout(() => {
        manualSignOutRef.current = false;
        console.log('🔄 Manual sign out ref cleared');
      }, 3000); // Increased to 3000ms to prevent INITIAL_SESSION from logging back in
      // Return early to skip ALL auth listener setup
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      isInitialized = true;
      // Reset manual sign out flag on fresh page load
      manualSignOutRef.current = false;
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 AUTH STATE CHANGE:', { 
        event, 
        hasSession: !!session, 
        isInitialized, 
        manualSignOut: manualSignOutRef.current,
        signingOut: signingOutRef.current,
        userEmail: session?.user?.email || 'null'
      });
      
      // If we manually signed out, ignore ALL auth state changes
      if (manualSignOutRef.current) {
        console.log('🚫 BLOCKING: Ignoring auth state change due to manual sign out');
        return;
      }
      
      // Additional check: if we're in the process of signing out, ignore everything
      if (signingOutRef.current) {
        console.log('🚫 BLOCKING: Ignoring auth state change - currently signing out');
        return;
      }
      
      console.log('✅ PROCESSING: Auth state change allowed, updating state...');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Note: Redirect is now handled directly in signOut function
    });

    // Store subscription reference for potential cleanup
    authSubscriptionRef.current = subscription;

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      // Clear manual sign out flag when user tries to sign up
      localStorage.removeItem('manual-sign-out');
      manualSignOutRef.current = false;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Clear manual sign out flag when user tries to login
      localStorage.removeItem('manual-sign-out');
      manualSignOutRef.current = false;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 ===== SIGN OUT STARTED =====');
      setSigningOut(true);
      signingOutRef.current = true;
      manualSignOutRef.current = true;
      
      // Clear local state immediately
      console.log('🚪 Clearing local state...');
      setUser(null);
      setSession(null);
      setLoading(false);
      
      // Clear localStorage FIRST
      console.log('💾 Setting manual-sign-out flag and clearing storage...');
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
      
      console.log('🧹 Storage cleared');
      
      // Unsubscribe from auth listener
      if (authSubscriptionRef.current) {
        console.log('🔌 Unsubscribing from auth listener...');
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
      
      // Try Supabase sign out (non-blocking)
      try {
        await supabase.auth.signOut();
        console.log('✅ Supabase sign out completed');
      } catch (e) {
        console.warn('⚠️ Supabase sign out failed (continuing anyway):', e);
      }
      
      // Force redirect immediately
      console.log('🏠 Redirecting to home page...');
      window.location.replace('/');
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Force logout even if there's an error
      setUser(null);
      setSession(null);
      localStorage.setItem('manual-sign-out', 'true');
      window.location.replace('/');
    }
  };

  const signInWithGoogle = async () => {
    // Clear manual sign out flag when user tries to login with Google
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
    // Clear manual sign out flag when user tries to login with Facebook
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
    signUp,
    signIn,
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
