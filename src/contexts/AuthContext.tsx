'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  ConfirmationResult
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

// Compatibility interface to match existing code expectations
interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
}

interface Session {
  user: User;
  expires_at?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingOut: boolean;
  sendOTP: (phone: string) => Promise<any>;
  verifyOTP: (phone: string, token: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  // Map Firebase user to compatibility format
  const mapFirebaseUser = (firebaseUser: FirebaseUser | null): User | null => {
    if (!firebaseUser) return null;

    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || null,
      phone: firebaseUser.phoneNumber || null,
      user_metadata: {
        full_name: firebaseUser.displayName || undefined,
        phone: firebaseUser.phoneNumber || undefined,
      },
    };
  };

  // Initialize reCAPTCHA verifier
  useEffect(() => {
    if (typeof window !== 'undefined' && !recaptchaVerifier && auth) {
      try {
        // Clear any existing reCAPTCHA
        const container = document.getElementById('recaptcha-container');
        if (container) {
          container.innerHTML = '';
        }

        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            // reCAPTCHA expired
            console.error('reCAPTCHA expired');
          },
        });
        setRecaptchaVerifier(verifier);
      } catch (error) {
        console.error('Error initializing reCAPTCHA:', error);
      }
    }

    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [auth]);

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const mappedUser = mapFirebaseUser(firebaseUser);
      setUser(mappedUser);
      
      if (mappedUser) {
        setSession({
          user: mappedUser,
          expires_at: undefined, // Firebase manages session expiration internally
        });
      } else {
        setSession(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const sendOTP = async (phone: string) => {
    try {
      if (!auth) {
        return {
          data: null,
          error: 'Firebase is not configured. Please check your environment variables.',
        };
      }

      if (!recaptchaVerifier) {
        return {
          data: null,
          error: 'reCAPTCHA not initialized. Please refresh the page.',
        };
      }

      // Format phone number (ensure it starts with +)
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

      console.log('Sending OTP to phone:', formattedPhone);

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(confirmation);

      console.log('OTP sent successfully');
      return { data: { confirmation }, error: null };
    } catch (error: any) {
      console.error('OTP send error:', error);
      
      let errorMessage = error.message || 'Failed to send OTP. Please try again.';
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please use international format (e.g., +1234567890)';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/captcha-check-failed') {
        errorMessage = 'reCAPTCHA verification failed. Please refresh the page and try again.';
      } else if (error.code === 'auth/billing-not-enabled') {
        errorMessage = 'Firebase billing is not enabled. Phone authentication requires a Blaze plan. Please enable billing in Firebase Console or use test phone numbers for development.';
      } else if (error.code === 'auth/internal-error') {
        errorMessage = 'An internal error occurred. This may be due to billing not being enabled. Please check Firebase Console settings.';
      }

      return { data: null, error: errorMessage };
    }
  };

  const verifyOTP = async (phone: string, token: string) => {
    try {
      if (!confirmationResult) {
        return {
          data: null,
          error: 'No OTP confirmation found. Please request a new OTP.',
        };
      }

      console.log('Verifying OTP for phone:', phone, 'token:', token);

      const result = await confirmationResult.confirm(token);
      
      console.log('OTP verified successfully:', result);

      // Update user state (handled by onAuthStateChanged)
      if (result.user) {
        const mappedUser = mapFirebaseUser(result.user);
        setUser(mappedUser);
        if (mappedUser) {
          setSession({
            user: mappedUser,
            expires_at: undefined,
          });
        } else {
          setSession(null);
        }
      }

      // Clear confirmation result
      setConfirmationResult(null);

      return { data: { user: result.user }, error: null };
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      let errorMessage = error.message || 'Failed to verify OTP. Please try again.';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'Verification code expired. Please request a new OTP.';
      }

      return { data: null, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      setSigningOut(true);
      if (!auth) {
        // If auth is not initialized, just clear local state
        setUser(null);
        setSession(null);
        window.location.href = '/';
        return;
      }
      await firebaseSignOut(auth);
      
      // Clear local state
      setUser(null);
      setSession(null);
      setConfirmationResult(null);
      
      // Small delay before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      setSigningOut(false);
      
      // Force logout even on error
      setUser(null);
      setSession(null);
      window.location.href = '/';
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signingOut,
    sendOTP,
    verifyOTP,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Hidden container for reCAPTCHA */}
      <div id="recaptcha-container" style={{ display: 'none' }}></div>
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
