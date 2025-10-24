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
      console.log('🚫 Manual sign out detected, clearing auth state and skipping listener');
      setSession(null);
      setUser(null);
      setLoading(false);
      manualSignOutRef.current = true;
      // Clear the flag immediately but keep the ref for a short time
      localStorage.removeItem('manual-sign-out');
      setTimeout(() => {
        manualSignOutRef.current = false;
        console.log('🔄 Manual sign out ref cleared');
      }, 500); // Reduced from 1000ms to 500ms
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
      console.log('🚪 SIGN OUT START - Setting flags...');
      setSigningOut(true);
      signingOutRef.current = true;
      manualSignOutRef.current = true; // Set flag to prevent re-login
      console.log('🚪 Flags set - signingOut:', signingOutRef.current, 'manualSignOut:', manualSignOutRef.current);
      
      // Clear local state first
      console.log('🚪 Clearing local state...');
      setUser(null);
      setSession(null);
      console.log('🚪 Local state cleared');
      
      // Unsubscribe from auth changes to prevent re-login
      if (authSubscriptionRef.current) {
        console.log('🔌 Unsubscribing from auth changes...');
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
        console.log('🔌 Unsubscribed successfully');
      }
      
      // Completely disable the supabase client
      console.log('🚫 Disabling Supabase client...');
      supabaseRef.current = null as any;
      
      // Force immediate redirect to prevent any auth state changes
      console.log('🏠 Redirecting immediately to prevent re-login...');
      
      // Use replace instead of assign to prevent back button issues
      window.location.replace('/');
      console.log('🏠 Redirect initiated');
      
      // Clear localStorage to ensure clean state
      try {
        // Set manual sign out flag to persist across page loads
        console.log('💾 Setting manual-sign-out flag in localStorage');
        localStorage.setItem('manual-sign-out', 'true');
        
        // Clear all Supabase auth-related localStorage items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
        // Also clear any session storage
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('sb-') && key.includes('auth')) {
            sessionStorage.removeItem(key);
          }
        });
        console.log('🧹 Storage cleared, manual-sign-out flag set');
      } catch (e) {
        console.warn('Could not clear storage:', e);
      }
      
      // Try to sign out from Supabase (but don't fail if it doesn't work)
      try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.warn('⚠️ Supabase sign out error (but continuing):', error.message);
        } else {
          console.log('✅ Supabase sign out successful');
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase sign out failed (but continuing):', supabaseError);
      }
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Even if there's an error, clear local state and redirect
      setUser(null);
      setSession(null);
      manualSignOutRef.current = true;
      localStorage.setItem('manual-sign-out', 'true');
      window.location.replace('/');
    } finally {
      setSigningOut(false);
      signingOutRef.current = false;
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
