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
  signInWithEmail: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUpWithEmail: (email: string, password: string, fullName?: string, redirectTo?: string) => Promise<{ data: any; error: any }>;
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
    let sessionTimeoutId: NodeJS.Timeout | null = null;
    let tokenRefreshInterval: NodeJS.Timeout | null = null;

    // Check if we manually signed out (persisted in localStorage)
    const wasManualSignOut = localStorage.getItem('manual-sign-out') === 'true';
    
    if (wasManualSignOut) {
      setSession(null);
      setUser(null);
      setLoading(false);
      manualSignOutRef.current = true;
      // Don't remove the flag immediately - keep it for 10 seconds to prevent auto re-login
      setTimeout(() => {
        localStorage.removeItem('manual-sign-out');
        setTimeout(() => {
          manualSignOutRef.current = false;
        }, 5000); // Additional 5 seconds after removing flag
      }, 10000); // Keep flag for 10 seconds
      return;
    }

    // Session timeout: 24 hours (Supabase default is 1 hour, but we'll check for expiration)
    const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
    const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // Refresh check every 30 minutes

    const checkSessionExpiry = (currentSession: Session | null) => {
      if (!currentSession?.expires_at) return;
      
      const expiresAt = currentSession.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // If session expired, sign out
      if (timeUntilExpiry <= 0) {
        console.log('Session expired, signing out...');
        supabase.auth.signOut().then(() => {
          setSession(null);
          setUser(null);
          window.location.replace('/');
        });
        return;
      }

      // Set timeout to sign out when session expires
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
      }
      sessionTimeoutId = setTimeout(() => {
        console.log('Session timeout reached, signing out...');
        supabase.auth.signOut().then(() => {
          setSession(null);
          setUser(null);
          window.location.replace('/');
        });
      }, timeUntilExpiry);
    };

    const refreshTokenIfNeeded = async () => {
      if (manualSignOutRef.current || signingOutRef.current) return;
      
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          // Check if token expires in less than 5 minutes
          const expiresAt = currentSession.expires_at ? currentSession.expires_at * 1000 : 0;
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;
          
          if (timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000) {
            // Refresh token (Supabase handles this automatically, but we can trigger it manually)
            if ('refreshSession' in supabase.auth && typeof supabase.auth.refreshSession === 'function') {
              const { data, error } = await supabase.auth.refreshSession(currentSession);
              if (error) {
                console.error('Error refreshing session:', error);
                if (error.message?.includes('refresh_token_not_found') || 
                    error.message?.includes('invalid_grant')) {
                  // Token is invalid, sign out
                  supabase.auth.signOut().then(() => {
                    setSession(null);
                    setUser(null);
                    window.location.replace('/');
                  });
                }
              } else if (data?.session) {
                setSession(data.session);
                setUser(data.session.user);
                checkSessionExpiry(data.session);
              }
            }
          } else if (timeUntilExpiry <= 0) {
            // Session expired
            supabase.auth.signOut().then(() => {
              setSession(null);
              setUser(null);
              window.location.replace('/');
            });
          } else {
            checkSessionExpiry(currentSession);
          }
        }
      } catch (error) {
        console.error('Error in token refresh check:', error);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Check if we manually signed out before restoring session
      const wasManualSignOut = localStorage.getItem('manual-sign-out') === 'true';
      
      if (wasManualSignOut) {
        // Don't restore session if user manually signed out
        setSession(null);
        setUser(null);
        setLoading(false);
        isInitialized = true;
        manualSignOutRef.current = true;
        // Keep the flag for longer to prevent auto re-login
        setTimeout(() => {
          manualSignOutRef.current = false;
        }, 10000); // 10 seconds instead of 3
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      isInitialized = true;
      manualSignOutRef.current = false;
      
      if (session) {
        checkSessionExpiry(session);
        // Set up periodic token refresh check
        tokenRefreshInterval = setInterval(refreshTokenIfNeeded, TOKEN_REFRESH_INTERVAL);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Check for manual sign-out flag on every auth state change
      const wasManualSignOut = localStorage.getItem('manual-sign-out') === 'true';
      
      if (wasManualSignOut || manualSignOutRef.current) {
        // If manually signed out, clear session and ignore auth state changes
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Additional check: if we're in the process of signing out, ignore everything
      if (signingOutRef.current) {
        return;
      }
      
      // Ignore TOKEN_REFRESHED events if we're in a sign-out state
      if (event === 'TOKEN_REFRESHED' && manualSignOutRef.current) {
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session) {
        checkSessionExpiry(session);
        // Set up periodic token refresh check if not already set
        if (!tokenRefreshInterval) {
          tokenRefreshInterval = setInterval(refreshTokenIfNeeded, TOKEN_REFRESH_INTERVAL);
        }
      } else {
        // Clear timeouts if session is null
        if (sessionTimeoutId) {
          clearTimeout(sessionTimeoutId);
          sessionTimeoutId = null;
        }
        if (tokenRefreshInterval) {
          clearInterval(tokenRefreshInterval);
          tokenRefreshInterval = null;
        }
      }
    });

    // Store subscription reference for potential cleanup
    authSubscriptionRef.current = subscription;

    return () => {
      subscription.unsubscribe();
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
      }
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // signOut is stable, no need to include in deps

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
      
      // Create user profile after successful OTP verification
      if (data?.user?.id) {
        // User profile is automatically created by database trigger (handle_new_user)
        // The trigger uses SECURITY DEFINER to bypass RLS policies
        // No need to create profile client-side - it will be created automatically
      }
      
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
      
      // Unsubscribe from auth listener FIRST to prevent interference
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setLoading(false);
      
      // Clear localStorage FIRST and set manual sign-out flag
      localStorage.setItem('manual-sign-out', 'true');
      
      // Clear all Supabase auth tokens and cookies
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
      
      // Clear Supabase cookies by setting them to expire
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.trim().split("=")[0];
        if (cookieName.includes('sb-') || cookieName.includes('supabase')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        }
      });
      
      // Try Supabase sign out with timeout
      try {
        const signOutPromise = supabase.auth.signOut();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign out timeout')), 3000)
        );
        
        await Promise.race([signOutPromise, timeoutPromise]);
      } catch (e) {
        // Continue even if Supabase sign out fails or times out
        console.log('Sign out completed (with or without Supabase confirmation)');
      }
      
      // Small delay to ensure state is cleared before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force redirect immediately
      window.location.href = '/';
      
    } catch (error) {
      // Force logout even if there's an error
      console.error('Error during sign out:', error);
      setUser(null);
      setSession(null);
      setSigningOut(false);
      localStorage.setItem('manual-sign-out', 'true');
      
      // Clear all auth-related storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      
      // Force redirect
      window.location.href = '/';
    }
  };

  const signInWithGoogle = async () => {
    try {
      localStorage.removeItem('manual-sign-out');
      manualSignOutRef.current = false;
      
      // Get the current origin (works for both localhost and production)
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${origin}/auth/callback`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Google sign in error:', error);
        console.error('Redirect URL:', redirectTo);
        console.error('Current origin:', origin);
        alert(`Google sign in error: ${error.message || 'Google sign in is not enabled. Please check your Supabase and Google Cloud Console configuration.'}`);
      } else if (data?.url) {
        // Redirect will happen automatically via Supabase
        // The redirect URL is already set in the options
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      console.error('Failed redirect URL:', `${origin}/auth/callback`);
      alert(`Google sign in error: ${error.message || 'Please check your configuration. Make sure:\n1. Google OAuth is enabled in Supabase\n2. Site URL is set in Supabase\n3. Redirect URI is added in Google Cloud Console'}`);
    }
  };

  const signInWithFacebook = async () => {
    try {
      localStorage.removeItem('manual-sign-out');
      manualSignOutRef.current = false;
      
      // Get the current origin (works for both localhost and production)
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${origin}/auth/callback`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectTo,
        },
      });
      
      if (error) {
        console.error('Facebook sign in error:', error);
        console.error('Redirect URL:', redirectTo);
        alert(`Facebook sign in error: ${error.message || 'Facebook sign in is not enabled. Please check your Supabase and Facebook App configuration.'}`);
      }
    } catch (error: any) {
      console.error('Facebook sign in error:', error);
      alert(`Facebook sign in error: ${error.message || 'Please check your configuration.'}`);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      localStorage.removeItem('manual-sign-out');
      manualSignOutRef.current = false;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Email sign in error:', error);
      return { data: null, error: error.message || 'Failed to sign in' };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string, redirectTo?: string) => {
    try {
      localStorage.removeItem('manual-sign-out');
      manualSignOutRef.current = false;
      
      // Store redirect URL for after verification
      if (redirectTo) {
        localStorage.setItem('signup-redirect', redirectTo);
      }
      
      // Get the origin URL for email verification redirect
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const verificationUrl = `${origin}/auth/verify-email`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: verificationUrl,
          data: {
            full_name: fullName || '',
          },
        },
      });
      
      if (error) throw error;
      
      // User profile is automatically created by database trigger (handle_new_user)
      // The trigger uses SECURITY DEFINER to bypass RLS policies
      // No need to create profile client-side - it will be created automatically
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Email sign up error:', error);
      return { data: null, error: error.message || 'Failed to sign up' };
    }
  };

  const value = {
    user,
    session,
    loading,
    signingOut,
    sendOTP,
    verifyOTP,
    signInWithEmail,
    signUpWithEmail,
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