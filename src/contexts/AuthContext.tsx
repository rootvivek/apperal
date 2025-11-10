'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  ConfirmationResult
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { createClient } from '@/lib/supabase/client';
import { checkUserActiveStatus } from '@/lib/supabase/client-auth';

// Type definitions
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

interface AuthResponse {
  data: any;
  error: string | null;
}

interface UserStatus {
  is_active: boolean;
  is_deleted?: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingOut: boolean;
  showBannedModal: boolean;
  setBannedModal: (show: boolean) => void;
  bannedReason: 'deleted' | 'deactivated' | string;
  sendOTP: (phone: string) => Promise<AuthResponse>;
  verifyOTP: (phone: string, token: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
}

// Create context
export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signingOut: false,
  showBannedModal: false,
  setBannedModal: () => {},
  bannedReason: '',
  sendOTP: async () => ({ data: null, error: 'AuthContext not initialized' }),
  verifyOTP: async () => ({ data: null, error: 'AuthContext not initialized' }),
  signOut: async () => {},
});

// Hook for consuming auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // State declarations
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [showBannedModal, setBannedModal] = useState(false);
  const [bannedReason, setBannedReason] = useState<'deleted' | 'deactivated' | string>('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  // Firebase user mapper
  const mapFirebaseUser = useCallback((firebaseUser: FirebaseUser | null): User | null => {
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
  }, []);

  // Ensure user profile exists in Supabase
  const ensureUserProfile = async (firebaseUser: FirebaseUser) => {
    if (!firebaseUser) return;

    try {
      const supabase = createClient();
      const userId = firebaseUser.uid;
      const userPhone = firebaseUser.phoneNumber || null;
      const displayName = firebaseUser.displayName || 'User';
      
      // Generate email - use Firebase email if available, otherwise create placeholder from phone
      let userEmail = firebaseUser.email || '';
      if (!userEmail && userPhone) {
        // Create placeholder email from phone number (email column is NOT NULL)
        const cleanPhone = userPhone.replace(/\D/g, ''); // Remove non-digits
        userEmail = `phone_${cleanPhone}@apperal.local`;
      } else if (!userEmail) {
        // Fallback if no phone either
        userEmail = `user_${userId.substring(0, 8)}@apperal.local`;
      }

      // Check if profile exists and is not deleted
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, deleted_at, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is expected for new users
        console.error('Error checking user profile:', {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          fullError: fetchError
        });
        return;
      }

      // If profile was deleted or deactivated, sign out the user and show banned modal
      if (existingProfile) {
        if (existingProfile.deleted_at) {
          console.warn('User profile was deleted. Signing out user:', userId);
          try {
            if (auth) await firebaseSignOut(auth);
          } catch (signOutError) {
            // Failed to sign out but continue with cleanup
          }
          setUser(null);
          setSession(null);
          setBannedReason('deleted');
          setBannedModal(true);
          return;
        }
        
        if ('is_active' in existingProfile && existingProfile.is_active === false) {
          console.warn('User profile is deactivated. Signing out user:', userId);
          try {
            if (auth) await firebaseSignOut(auth);
          } catch (signOutError) {
            // Failed to sign out but continue with cleanup
          }
          setUser(null);
          setSession(null);
          setBannedReason('deactivated');
          setBannedModal(true);
          return;
        }

        // Profile exists, update it with latest Firebase data
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            email: userEmail,
            full_name: displayName,
            phone: userPhone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating user profile:', updateError);
        }
      } else {
        // Profile doesn't exist, create it
        const { data, error } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: userEmail,
            full_name: displayName,
            phone: userPhone,
          })
          .select();

        if (error) {
          console.error('Error creating user profile:', error);
        } else if (data && data.length > 0) {
          console.log('User profile created successfully:', userId);
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  };

  // Initialize reCAPTCHA verifier
  useEffect(() => {
    async function initializeRecaptcha() {
      if (typeof window === 'undefined' || recaptchaVerifier || !auth) {
        return;
      }

      try {
        // Clear any existing reCAPTCHA
        const container = document.getElementById('recaptcha-container');
        if (container) {
          container.innerHTML = '';
        }

        // Create new verifier
        const verifier = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          {
            size: 'invisible',
            callback: () => {
              console.log('reCAPTCHA verified');
            },
            'expired-callback': () => {
              console.error('reCAPTCHA expired');
              setRecaptchaVerifier(null);
            },
          }
        );

        // Render the reCAPTCHA to ensure it's ready
        await verifier.render();
        setRecaptchaVerifier(verifier);
        console.log('reCAPTCHA initialized successfully');
      } catch (error) {
        console.error('Error initializing reCAPTCHA:', error);
        setRecaptchaVerifier(null);
      }
    }

    initializeRecaptcha();

    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (error) {
          console.warn('Error cleaning up reCAPTCHA:', error);
        }
        setRecaptchaVerifier(null);
      }
    };
  }, [auth, recaptchaVerifier]);

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
      
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const mappedUser = mapFirebaseUser(firebaseUser);
      setUser(mappedUser);
      
      if (mappedUser && firebaseUser) {
        setSession({
          user: mappedUser,
          expires_at: undefined, // Firebase manages session expiration internally
        });
        // Ensure user profile exists in Supabase
        await ensureUserProfile(firebaseUser);
      } else {
        setSession(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, mapFirebaseUser]);

  // Subscribe to realtime updates on the user's profile to detect deactivation or deletion by admin.
  // Fallback: if realtime subscription fails, we keep a polling interval as backup.
  useEffect(() => {
    let channel: any = null;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const handleDeactivation = async (reason: 'deleted' | 'deactivated') => {
      setBannedReason(reason);
      setBannedModal(true);
      try {
        if (auth) {
          await firebaseSignOut(auth);
        }
      } catch (e) {
        // Ignore signout errors during deactivation
      }
      setUser(null);
      setSession(null);
    };

    const startPolling = () => {
      const checkProfile = async () => {
        if (!user) return;
        try {
          const supabase = createClient();
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id, deleted_at, is_active')
            .eq('id', user.id)
            .maybeSingle();

          if (!profile) return;

          if (profile.deleted_at) {
            await handleDeactivation('deleted');
          } else if ('is_active' in profile && profile.is_active === false) {
            await handleDeactivation('deactivated');
          }
        } catch (err) {
          // Ignore polling errors
        }
      };

      checkProfile();
      intervalId = setInterval(checkProfile, 10000);
    };

    const startRealtime = async () => {
      if (!user?.id) return;

      try {
        const supabase = createClient();
        
        // Create channel for user profile changes
        channel = (supabase as any).channel(`public:user_profiles:${user.id}`)
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: 'user_profiles', 
              filter: `id=eq.${user.id}` 
            },
            async (payload: any) => {
              const record = payload.new || payload.old;
              if (!record) return;

              // Handle profile updates
              if (record.deleted_at || ('is_active' in record && record.is_active === false)) {
                await handleDeactivation(record.deleted_at ? 'deleted' : 'deactivated');
              }
            }
          );

        const status = await channel.subscribe();
        
        if (status !== 'SUBSCRIBED') {
          if (!intervalId) startPolling();
        }
      } catch (err) {
        // Realtime not available - start polling
        startPolling();
      }
    };

    if (user) {
      startRealtime();
    }

    return () => {
      if (channel) {
        try { 
          channel.unsubscribe();
        } catch (e) {
          console.warn('Error unsubscribing from channel:', e);
        }
      }
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  const handleOTPSend = useCallback(async (phone: string): Promise<AuthResponse> => {
    try {
      if (!auth) {
        const missingVars = [
          !process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 'NEXT_PUBLIC_FIREBASE_API_KEY',
          !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
          !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
          !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET && 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
          !process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID && 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
          !process.env.NEXT_PUBLIC_FIREBASE_APP_ID && 'NEXT_PUBLIC_FIREBASE_APP_ID',
        ].filter(Boolean);
        
        return {
          data: null,
          error: `Firebase not configured. Missing: ${missingVars.join(', ')}`,
        };
      }

      if (!recaptchaVerifier) {
        return {
          data: null,
          error: 'Security verification not ready. Please refresh.',
        };
      }

      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      console.log('Sending OTP to:', formattedPhone);

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(confirmation);
      
      return { data: { success: true }, error: null };
    } catch (error) {
      console.error('Error sending OTP:', error);
      
      if (error instanceof Error) {
        const authError = error as { code?: string };
        switch (authError.code) {
          case 'auth/invalid-phone-number':
            return { data: null, error: 'Invalid phone number format.' };
          case 'auth/too-many-requests':
            return { data: null, error: 'Too many attempts. Please wait.' };
          case 'auth/quota-exceeded':
            return { data: null, error: 'Service temporarily unavailable.' };
          default:
            return { data: null, error: 'Failed to send verification code.' };
        }
      }
      
      return { data: null, error: 'Failed to send verification code.' };
    }
  }, [auth, recaptchaVerifier]);

  const handleOTPVerify = useCallback(async (phone: string, token: string): Promise<AuthResponse> => {
    try {
      if (!confirmationResult) {
        return {
          data: null,
          error: 'No verification code was sent. Please request a new one.'
        };
      }

      const result = await confirmationResult.confirm(token);
      if (!result?.user) {
        return {
          data: null,
          error: 'Failed to verify code.'
        };
      }

      const { isActive, error: statusError } = await checkUserActiveStatus(result.user.uid);
      if (statusError) {
        return {
          data: null,
          error: 'Failed to verify user status.'
        };
      }

      if (!isActive) {
        setBannedReason('deactivated');
        setBannedModal(true);

        try {
          if (auth) await firebaseSignOut(auth);
        } catch (error) {
          console.warn('Error during cleanup:', error);
        }

        setUser(null);
        setSession(null);
        
        return {
          data: null,
          error: 'Account has been deactivated.'
        };
      }

      const mappedUser = mapFirebaseUser(result.user);
      if (!mappedUser) {
        return {
          data: null,
          error: 'Failed to process user data.'
        };
      }

      setUser(mappedUser);
      setSession({
        user: mappedUser,
        expires_at: undefined
      });

      // Setup/update Supabase profile
      await ensureUserProfile(result.user);

      setConfirmationResult(null);
      return { data: { user: mappedUser }, error: null };

    } catch (error) {
      console.error('Error verifying OTP:', error);
      
      let errorMessage = 'Failed to verify code.';
      
      if (error instanceof Error) {
        const authError = error as { code?: string };
        switch (authError.code) {
          case 'auth/invalid-verification-code':
            errorMessage = 'Invalid code. Please check and try again.';
            break;
          case 'auth/code-expired':
            errorMessage = 'Code has expired. Please request a new one.';
            break;
        }
      }

      setConfirmationResult(null);
      return { data: null, error: errorMessage };
    }
  }, [auth, confirmationResult, mapFirebaseUser]);

  const handleSignOut = useCallback(async () => {
    try {
      setSigningOut(true);

      if (auth) {
        await firebaseSignOut(auth);
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
      setConfirmationResult(null);
      
      // Small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      setSigningOut(false);
      
      // Force cleanup on error
      setUser(null);
      setSession(null);
      window.location.href = '/';
    }
  }, [auth]);

  // Context value
  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    signingOut,
    showBannedModal,
    setBannedModal,
    bannedReason,
    sendOTP: handleOTPSend,
    verifyOTP: handleOTPVerify,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {/* Hidden container for reCAPTCHA */}
      <div id="recaptcha-container" style={{ display: 'none' }}></div>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;