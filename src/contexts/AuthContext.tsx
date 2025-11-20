'use client';

import { createContext, useCallback, useContext, useEffect, useState, useMemo, useRef } from 'react';
// Use type-only imports for Firebase types to prevent Turbopack HMR issues
import type { 
  User as FirebaseUser,
  RecaptchaVerifier,
  ConfirmationResult
} from 'firebase/auth';
import { getAuth as getFirebaseAuth } from '@/lib/firebase/config';
import { createClient } from '@/lib/supabase/client';
// checkUserActiveStatus will be dynamically imported to prevent Turbopack HMR issues

// Type definitions
interface User {
  id: string;
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
  authLoading: boolean; // Alias for loading for clarity
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
  authLoading: true,
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
  
  // Helper to get auth instance (lazy-loaded)
  const getAuthInstance = useCallback(async () => {
    return await getFirebaseAuth();
  }, []);

  // Firebase user mapper
  const mapFirebaseUser = useCallback((firebaseUser: FirebaseUser | null): User | null => {
    if (!firebaseUser) return null;
    return {
      id: firebaseUser.uid,
      phone: firebaseUser.phoneNumber || null,
      user_metadata: {
        full_name: firebaseUser.displayName || undefined,
        phone: firebaseUser.phoneNumber || undefined,
      },
    };
  }, []);

  // Ensure user profile exists in Supabase
  const ensureUserProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    if (!firebaseUser) return;

    try {
      const supabase = createClient();
      const userId = firebaseUser.uid;
      const userPhone = firebaseUser.phoneNumber || null;
      const displayName = firebaseUser.displayName || 'User';

      // Check if profile exists and is not deleted
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, deleted_at, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is expected for new users
        return;
      }

      // If profile was deleted or deactivated, sign out the user and show banned modal
      if (existingProfile) {
        if (existingProfile.deleted_at) {
          // Set banned state first, then sign out
          // Firebase signOut will trigger onAuthStateChanged with null user,
          // which will handle setUser(null) and setSession(null)
          setBannedReason('deleted');
          setBannedModal(true);
          try {
            const auth = await getAuthInstance();
            if (auth) {
              const { signOut: firebaseSignOut } = await import('firebase/auth');
              await firebaseSignOut(auth);
            }
          } catch (signOutError) {
            // Failed to sign out but continue with cleanup
            setUser(null);
            setSession(null);
          }
          return;
        }
        
        if ('is_active' in existingProfile && existingProfile.is_active === false) {
          // Set banned state first, then sign out
          // Firebase signOut will trigger onAuthStateChanged with null user,
          // which will handle setUser(null) and setSession(null)
          setBannedReason('deactivated');
          setBannedModal(true);
          try {
            const auth = await getAuthInstance();
            if (auth) {
              const { signOut: firebaseSignOut } = await import('firebase/auth');
              await firebaseSignOut(auth);
            }
          } catch (signOutError) {
            // Failed to sign out but continue with cleanup
            setUser(null);
            setSession(null);
          }
          return;
        }

        // Profile exists, update it with latest Firebase data
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: displayName,
            phone: userPhone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          // Error handled silently
        }
      } else {
        // Profile doesn't exist for this UID
        // Check if there's a soft-deleted profile with the same phone number
        // If so, hard delete it to allow the new user to create an account
        if (userPhone) {
          // Query for profiles with the same phone number
          const { data: profilesWithPhone, error: deletedCheckError } = await supabase
            .from('user_profiles')
            .select('id, deleted_at')
            .eq('phone', userPhone);

          if (!deletedCheckError && profilesWithPhone) {
            // Find any soft-deleted profile (deleted_at is not null)
            const deletedProfile = profilesWithPhone.find((p: { id: string; deleted_at: string | null }) => p.deleted_at !== null);

            if (deletedProfile) {
              // Found a soft-deleted profile with the same phone number
              // Hard delete it to allow the new user to create an account
              const { error: hardDeleteError } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', deletedProfile.id);

              if (hardDeleteError) {
                // Continue anyway - try to create the new profile
              }
            }
          }
        }

        // Create new profile
        const { data, error } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            full_name: displayName,
            phone: userPhone,
          })
          .select();

        if (error) {
          // Handle unique constraint violations (23505)
          if (error.code === '23505') {
            // First, check if profile already exists for this user ID
            const { data: existingProfile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('id', userId)
              .maybeSingle();
            
            if (existingProfile) {
              // Profile already exists for this user - this is fine, no error
              return;
            }

            // Check what constraint was violated
            const isPhoneConflict = error.message?.includes('user_profiles_phone_key') || error.message?.includes('phone');
            const isIdConflict = error.message?.includes('user_profiles_pkey') || error.message?.includes('id');

            // If it's a phone conflict, try to resolve
            if (isPhoneConflict && userPhone) {
              const { data: phoneProfile } = await supabase
              .from('user_profiles')
              .select('id, deleted_at')
              .eq('phone', userPhone)
              .maybeSingle();

              if (phoneProfile) {
                // If the conflicting profile is soft-deleted or belongs to a different user, delete it
                if (phoneProfile.deleted_at || phoneProfile.id !== userId) {
              await supabase
                .from('user_profiles')
                .delete()
                    .eq('id', phoneProfile.id);

              // Retry creating the profile
              const { data: retryData, error: retryError } = await supabase
                .from('user_profiles')
                .insert({
                  id: userId,
                  full_name: displayName,
                  phone: userPhone,
                })
                .select();

                  if (!retryError && retryData && retryData.length > 0) {
                    return;
                  }
                }
              }
            }

            // If it's an ID conflict, profile already exists - verify and return
            if (isIdConflict) {
              const { data: idProfile } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('id', userId)
                .maybeSingle();
              
              if (idProfile) {
                // Profile exists, this is fine
                return;
              }
            }

            // If we get here, it's an unexpected duplicate constraint violation
            return;
          }

          // Errors handled silently - profile creation will be retried on next auth state change
        } else if (data && data.length > 0) {
          // Profile created successfully
        }
      }
    } catch (error) {
      // Error handled silently - will retry on next auth state change
    }
  }, [getAuthInstance]);

  // Helper function to initialize reCAPTCHA verifier
  const initializeRecaptcha = useCallback(async (): Promise<RecaptchaVerifier | null> => {
    if (typeof window === 'undefined') {
      return null;
    }
    
    const auth = await getAuthInstance();
    if (!auth) {
      return null;
    }
    
    try {
      // Wait for container to be available (with retry)
      let container = document.getElementById('recaptcha-container');
      let retries = 0;
      while (!container && retries < 5) {
        await new Promise(resolve => setTimeout(resolve, 100));
        container = document.getElementById('recaptcha-container');
        retries++;
      }

      if (!container) {
        return null;
      }

      // Clear any existing reCAPTCHA
      // Clear container safely
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Clear existing verifier if any
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch {
          // Ignore cleanup errors
        }
        setRecaptchaVerifier(null);
      }

      // Dynamically import RecaptchaVerifier to prevent Turbopack HMR issues
      const { RecaptchaVerifier: RecaptchaVerifierClass } = await import('firebase/auth');
      // Create new verifier
      const verifier = new RecaptchaVerifierClass(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA verified
          },
          'expired-callback': () => {
            setRecaptchaVerifier(null);
          },
        }
      );

      await verifier.render();
      setRecaptchaVerifier(verifier);
      return verifier;
    } catch (error: any) {
      // Silently handle reCAPTCHA errors - these are often non-critical warnings
      // Common issues:
      // - Domain not authorized in Firebase console (add localhost to authorized domains)
      // - reCAPTCHA key issues (check Firebase console settings)
      // - Network errors (will retry on next attempt)
      setRecaptchaVerifier(null);
      return null;
    }
  }, [getAuthInstance, recaptchaVerifier]);

  // Initialize reCAPTCHA verifier on mount - defer until after initial render
  useEffect(() => {
    const initRecaptcha = async () => {
      // Defer initialization until after initial paint
      await new Promise(resolve => {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(resolve, { timeout: 3000 });
        } else {
          setTimeout(resolve, 100);
        }
      });
      
      if (!recaptchaVerifier) {
        const auth = await getAuthInstance();
        if (auth) {
          initializeRecaptcha();
        }
      }
    };
    
    initRecaptcha();

    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch {
          // Ignore cleanup errors
        }
        setRecaptchaVerifier(null);
      }
    };
  }, [getAuthInstance, initializeRecaptcha]); // Include initializeRecaptcha in deps

  // Use refs to track state and prevent infinite loops
  const lastUserIdRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  
  // Listen for auth state changes - Defer Firebase initialization until after initial render
  useEffect(() => {
    mountedRef.current = true;
    
    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Reset processing flag but keep lastUserId to prevent duplicate processing
    isProcessingRef.current = false;
    
    // Defer Firebase initialization until after initial paint
    // Use requestIdleCallback or setTimeout to ensure page can render first
    const initFirebase = async () => {
      try {
        // Wait for next tick to allow initial render
        await new Promise(resolve => {
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(resolve, { timeout: 2000 });
          } else {
            setTimeout(resolve, 0);
          }
        });

        if (!mountedRef.current) return;

        // Lazy-load Firebase auth
        const auth = await getFirebaseAuth();
        if (!auth || !mountedRef.current) {
          setLoading(false);
          return;
        }

        const { onAuthStateChanged } = await import('firebase/auth');
        if (!mountedRef.current) return;
        
        unsubscribeRef.current = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!mountedRef.current || isProcessingRef.current) return;
          
          // Prevent duplicate updates for the same user
          const currentUserId = firebaseUser?.uid || null;
          if (currentUserId === lastUserIdRef.current) {
            return;
          }
          
          isProcessingRef.current = true;
          lastUserIdRef.current = currentUserId;
          
          try {
            const mappedUser = mapFirebaseUser(firebaseUser);
            
            // If user is null (signed out), just update state and return
            // Don't call ensureUserProfile for null users
            if (!mappedUser || !firebaseUser) {
              // Clear user ID from localStorage on sign out
              if (typeof window !== 'undefined') {
                localStorage.removeItem('firebase_user_id');
              }
              setUser((prevUser) => {
                if (!prevUser) {
                  return prevUser; // Already null, no change
                }
                return null;
              });
              setSession((prevSession) => {
                if (!prevSession) {
                  return prevSession; // Already null, no change
                }
                return null;
              });
              setLoading(false);
              return;
            }
            
            // Only update state if user actually changed
            setUser((prevUser) => {
              if (prevUser?.id === mappedUser?.id) {
                return prevUser; // No change, return previous to prevent re-render
              }
              // Store user ID in localStorage for image upload authentication
              if (mappedUser?.id && typeof window !== 'undefined') {
                localStorage.setItem('firebase_user_id', mappedUser.id);
              }
              return mappedUser;
            });
            
            setSession((prevSession) => {
              if (prevSession?.user?.id === mappedUser.id) {
                return prevSession; // No change, return previous to prevent re-render
              }
              return {
                user: mappedUser,
                expires_at: undefined, // Firebase manages session expiration internally
              };
            });
            
            // Ensure user profile exists in Supabase
            // Call ensureUserProfile directly - it's stable due to useCallback
            await ensureUserProfile(firebaseUser);
            
            setLoading(false);
          } finally {
            isProcessingRef.current = false;
          }
        });
      } catch (error) {
        // Error handled silently
        if (mountedRef.current) setLoading(false);
      }
    };

    // Start initialization after initial render
    initFirebase();

    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [mapFirebaseUser, ensureUserProfile]); // mapFirebaseUser and ensureUserProfile are stable via useCallback

  // Subscribe to realtime updates on the user's profile to detect deactivation or deletion by admin.
  // Fallback: if realtime subscription fails, we keep a polling interval as backup.
  useEffect(() => {
    let channel: any = null;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const handleDeactivation = async (reason: 'deleted' | 'deactivated') => {
      setBannedReason(reason);
      setBannedModal(true);
      try {
        const auth = await getAuthInstance();
        if (auth) {
          const { signOut: firebaseSignOut } = await import('firebase/auth');
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
          // Ignore unsubscribe errors
        }
      }
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  const handleOTPSend = useCallback(async (phone: string): Promise<AuthResponse> => {
    try {
      // Lazy-load Firebase auth when user actually tries to login
      const auth = await getAuthInstance();
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
      
      // Verify recaptchaVerifier is still valid before using it
      let verifierToUse = recaptchaVerifier;
      if (!verifierToUse) {
        // Try to reinitialize if not available
        const newVerifier = await initializeRecaptcha();
        if (!newVerifier) {
          return {
            data: null,
            error: 'Security verification not ready. Please refresh the page.',
          };
        }
        verifierToUse = newVerifier;
      }

      // Additional validation: ensure verifier is properly initialized
      // Check if container exists and verifier is valid
      const container = document.getElementById('recaptcha-container');
      if (!container) {
        return {
          data: null,
          error: 'Security verification container not found. Please refresh the page.',
        };
      }

      const { signInWithPhoneNumber } = await import('firebase/auth');
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifierToUse);
      setConfirmationResult(confirmation);
      
      return { data: { success: true }, error: null };
    } catch (error: any) {
      // Firebase errors can be Error instances or plain objects with code property
      const errorCode = error?.code || (error?.message?.includes('auth/') ? error.message : '') || '';
      const errorMessage = error?.message || error?.toString() || '';
      
      // Check for quota/limit related errors first (can appear in different error codes)
      const isQuotaError = 
        errorCode === 'auth/quota-exceeded' ||
        errorCode === 'auth/too-many-requests' ||
        errorMessage?.toLowerCase().includes('quota') ||
        errorMessage?.toLowerCase().includes('limit') ||
        errorMessage?.toLowerCase().includes('exceeded') ||
        errorMessage?.toLowerCase().includes('sms') && errorMessage?.toLowerCase().includes('limit');

      if (isQuotaError) {
        return { 
          data: null, 
          error: 'SMS OTP limit reached. The daily quota for sending verification codes has been exceeded. Please try again tomorrow or contact support if you need immediate access.' 
        };
      }

      // Handle Firebase auth error codes
      if (errorCode) {
        switch (errorCode) {
          case 'auth/invalid-phone-number':
            return { data: null, error: 'Invalid phone number format. Please check and try again.' };
          case 'auth/too-many-requests':
            return { data: null, error: 'Too many attempts. Please wait a few minutes before trying again.' };
          case 'auth/quota-exceeded':
            return { 
              data: null, 
              error: 'SMS OTP quota exceeded. The daily limit for sending verification codes has been reached. Please try again tomorrow or contact support.' 
            };
          case 'auth/captcha-check-failed':
            // Reinitialize reCAPTCHA verifier when it fails (e.g., after removing test phone numbers)
            try {
              // Clear existing verifier
              if (recaptchaVerifier) {
                try {
                  recaptchaVerifier.clear();
                } catch {
                  // Ignore cleanup errors
                }
                setRecaptchaVerifier(null);
              }
              // Reinitialize
              const newVerifier = await initializeRecaptcha();
              if (newVerifier) {
                return { 
                  data: null, 
                  error: 'Security verification failed. Please try again - the verification has been reset.' 
                };
              }
            } catch (reinitError) {
              // Ignore reinit errors
            }
            return { data: null, error: 'Security verification failed. Please refresh the page and try again.' };
          case 'auth/invalid-app-credential':
            // This error can also occur when SMS quota is exceeded
            if (errorMessage?.toLowerCase().includes('quota') || errorMessage?.toLowerCase().includes('limit')) {
              return { 
                data: null, 
                error: 'SMS OTP limit reached. The daily quota for sending verification codes has been exceeded. Please try again tomorrow.' 
              };
            }
            return { 
              data: null, 
              error: 'Firebase configuration error. Please ensure your domain is authorized in Firebase Console (Authentication > Settings > Authorized domains).' 
            };
          case 'auth/app-not-authorized':
            return { data: null, error: 'App not authorized. Please contact support.' };
          default:
            // If error message contains useful info, include it
            if (errorMessage && errorMessage.includes('captcha')) {
              // Try to reinitialize reCAPTCHA when captcha-related errors occur
              try {
                if (recaptchaVerifier) {
                  try {
                    recaptchaVerifier.clear();
                  } catch {
                    // Ignore cleanup errors
                  }
                  setRecaptchaVerifier(null);
                }
                await initializeRecaptcha();
              } catch {
                // Ignore reinit errors
              }
              return { data: null, error: 'Security verification issue. Please try again - the verification has been reset.' };
            }
            // Check if it's a quota error in the message
            if (errorMessage?.toLowerCase().includes('quota') || errorMessage?.toLowerCase().includes('limit')) {
              return { 
                data: null, 
                error: 'SMS OTP limit reached. Please try again tomorrow or contact support.' 
              };
            }
            return { data: null, error: `Failed to send verification code. ${errorMessage || 'Please try again.'}` };
        }
      }
      
      // Fallback for unknown error types
      return { data: null, error: 'Failed to send verification code. Please refresh the page and try again.' };
    }
  }, [getAuthInstance, recaptchaVerifier, initializeRecaptcha]);

  const handleOTPVerify = useCallback(async (phone: string, token: string): Promise<AuthResponse> => {
    try {
      if (!confirmationResult) {
        return {
          data: null,
          error: 'No verification code was sent. Please request a new one.'
        };
      }

      // Attempt to verify the code
      // Firebase allows multiple attempts with the same confirmationResult
      const result = await confirmationResult.confirm(token);
      if (!result?.user) {
        return {
          data: null,
          error: 'Failed to verify code.'
        };
      }

      // Dynamically import checkUserActiveStatus to prevent Turbopack HMR issues
      const { checkUserActiveStatus } = await import('@/lib/supabase/client-auth');
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
          const auth = await getAuthInstance();
          if (auth) {
            const { signOut: firebaseSignOut } = await import('firebase/auth');
            await firebaseSignOut(auth);
          }
        } catch (error) {
          // Ignore cleanup errors
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

    } catch (error: any) {
      // Extract error code from Firebase error object
      // Firebase errors can have code in different places: error.code, error.error?.code, or error.message
      let errorCode = '';
      let errorMessageText = '';
      
      if (error?.code) {
        errorCode = error.code;
      } else if (error?.error?.code) {
        errorCode = error.error.code;
      } else if (error?.message) {
        errorMessageText = error.message;
        // Try to extract code from message (e.g., "Firebase: Error (auth/invalid-verification-code)")
        const codeMatch = errorMessageText.match(/auth\/[a-z-]+/i);
        if (codeMatch) {
          errorCode = codeMatch[0];
        }
      }
      
      // If still no code, check if it's a string error
      if (!errorCode && typeof error === 'string') {
        errorMessageText = error;
        const codeMatch = error.match(/auth\/[a-z-]+/i);
        if (codeMatch) {
          errorCode = codeMatch[0];
        }
      }
      
      let errorMessage = 'Failed to verify code.';
      let shouldClearConfirmation = false;
      
      switch (errorCode) {
        case 'auth/invalid-verification-code':
          errorMessage = 'Invalid code. Please check and try again.';
          // Don't clear confirmationResult for invalid code - user can try again
          shouldClearConfirmation = false;
          break;
        case 'auth/code-expired':
          errorMessage = 'Code has expired. Please request a new one.';
          // Clear confirmationResult only when code expires
          shouldClearConfirmation = true;
          break;
        case 'auth/session-expired':
          errorMessage = 'Session expired. Please request a new code.';
          shouldClearConfirmation = true;
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please request a new code.';
          shouldClearConfirmation = true;
          break;
        default:
          // Check error message for expiration or session issues
          const message = errorMessageText || error?.message || '';
          if (message.toLowerCase().includes('expired') || 
              message.toLowerCase().includes('session')) {
            errorMessage = 'Session expired. Please request a new code.';
            shouldClearConfirmation = true;
          } else {
            // For other errors (including invalid code without specific code), don't clear confirmationResult
            // This allows user to retry with correct code after wrong attempts
            errorMessage = message || 'Invalid code. Please check and try again.';
            shouldClearConfirmation = false;
          }
      }

      // Only clear confirmationResult if code expired, session expired, or too many attempts
      // This allows user to retry with correct code after wrong attempts (up to Firebase's limit)
      if (shouldClearConfirmation) {
        setConfirmationResult(null);
      }
      
      return { data: null, error: errorMessage };
    }
  }, [getAuthInstance, confirmationResult, mapFirebaseUser]);

  const handleSignOut = useCallback(async () => {
    try {
      setSigningOut(true);
      const auth = await getAuthInstance();

      if (auth) {
        const { signOut: firebaseSignOut } = await import('firebase/auth');
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
    } catch {
      setSigningOut(false);
      
      // Force cleanup on error
      setUser(null);
      setSession(null);
      window.location.href = '/';
    }
  }, [getAuthInstance]);

  // Context value - memoized to prevent unnecessary re-renders
  const contextValue: AuthContextType = useMemo(() => ({
    user,
    session,
    loading,
    authLoading: loading, // Alias for loading for clarity
    signingOut,
    showBannedModal,
    setBannedModal,
    bannedReason,
    sendOTP: handleOTPSend,
    verifyOTP: handleOTPVerify,
    signOut: handleSignOut,
  }), [user, session, loading, signingOut, showBannedModal, bannedReason, handleOTPSend, handleOTPVerify, handleSignOut]);

  return (
    <AuthContext.Provider value={contextValue}>
      {/* Hidden container for reCAPTCHA */}
      <div 
        id="recaptcha-container" 
        style={{ 
          display: 'none',
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
        aria-hidden="true"
      ></div>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;