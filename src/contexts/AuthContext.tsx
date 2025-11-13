'use client';

import { createContext, useCallback, useContext, useEffect, useState, useMemo, useRef } from 'react';
// Use type-only imports for Firebase types to prevent Turbopack HMR issues
import type { 
  User as FirebaseUser,
  RecaptchaVerifier,
  ConfirmationResult
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { createClient } from '@/lib/supabase/client';
// checkUserActiveStatus will be dynamically imported to prevent Turbopack HMR issues

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
  const ensureUserProfile = useCallback(async (firebaseUser: FirebaseUser) => {
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
          // Set banned state first, then sign out
          // Firebase signOut will trigger onAuthStateChanged with null user,
          // which will handle setUser(null) and setSession(null)
          setBannedReason('deleted');
          setBannedModal(true);
          try {
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
          console.warn('User profile is deactivated. Signing out user:', userId);
          // Set banned state first, then sign out
          // Firebase signOut will trigger onAuthStateChanged with null user,
          // which will handle setUser(null) and setSession(null)
          setBannedReason('deactivated');
          setBannedModal(true);
          try {
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
              console.log('Found soft-deleted profile with same phone, hard deleting:', deletedProfile.id);
              const { error: hardDeleteError } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', deletedProfile.id);

              if (hardDeleteError) {
                console.warn('Failed to hard delete old soft-deleted profile:', hardDeleteError);
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
            email: userEmail,
            full_name: displayName,
            phone: userPhone,
          })
          .select();

        if (error) {
          // If error is due to unique constraint on phone, try to find and delete the conflicting profile
          if (error.code === '23505' && userPhone) {
            console.log('Phone number conflict detected, attempting to resolve...');
            const { data: conflictingProfile } = await supabase
              .from('user_profiles')
              .select('id, deleted_at')
              .eq('phone', userPhone)
              .maybeSingle();

            if (conflictingProfile) {
              // Delete the conflicting profile (should be soft-deleted, but hard delete to be sure)
              await supabase
                .from('user_profiles')
                .delete()
                .eq('id', conflictingProfile.id);

              // Retry creating the profile
              const { data: retryData, error: retryError } = await supabase
                .from('user_profiles')
                .insert({
                  id: userId,
                  email: userEmail,
                  full_name: displayName,
                  phone: userPhone,
                })
                .select();

              if (retryError) {
                console.error('Error creating user profile after conflict resolution:', retryError);
              } else if (retryData && retryData.length > 0) {
                console.log('User profile created successfully after conflict resolution:', userId);
              }
            } else {
              console.error('Error creating user profile:', error);
            }
          } else {
            console.error('Error creating user profile:', error);
          }
        } else if (data && data.length > 0) {
          console.log('User profile created successfully:', userId);
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  }, [auth]);

  // Helper function to initialize reCAPTCHA verifier
  const initializeRecaptcha = useCallback(async (): Promise<RecaptchaVerifier | null> => {
    if (typeof window === 'undefined' || !auth) {
      console.error('Cannot initialize reCAPTCHA: window or auth not available');
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
        console.error('reCAPTCHA container not found after retries');
        return null;
      }

      // Clear any existing reCAPTCHA
      container.innerHTML = '';

      // Clear existing verifier if any
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          // Ignore cleanup errors
          console.warn('Error clearing existing verifier:', e);
        }
        setRecaptchaVerifier(null);
      }

      console.log('Creating new RecaptchaVerifier...');
      // Dynamically import RecaptchaVerifier to prevent Turbopack HMR issues
      const { RecaptchaVerifier: RecaptchaVerifierClass } = await import('firebase/auth');
      // Create new verifier
      const verifier = new RecaptchaVerifierClass(
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

      console.log('Rendering reCAPTCHA...');
      // Render the reCAPTCHA to ensure it's ready
      await verifier.render();
      setRecaptchaVerifier(verifier);
      console.log('reCAPTCHA initialized successfully');
      return verifier;
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fullError: error
      });
      setRecaptchaVerifier(null);
      return null;
    }
  }, [auth, recaptchaVerifier]);

  // Initialize reCAPTCHA verifier on mount
  useEffect(() => {
    if (!recaptchaVerifier && auth) {
      initializeRecaptcha();
    }

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
  }, [auth, initializeRecaptcha]); // Include initializeRecaptcha in deps

  // Use refs to track state and prevent infinite loops
  const lastUserIdRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  
  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
      }
      
    mountedRef.current = true;
    
    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Reset processing flag but keep lastUserId to prevent duplicate processing
    isProcessingRef.current = false;
    
    (async () => {
      try {
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
        console.error('Error loading Firebase auth:', error);
        if (mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [auth, mapFirebaseUser, ensureUserProfile]); // mapFirebaseUser and ensureUserProfile are stable via useCallback

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
      
      // Verify recaptchaVerifier is still valid before using it
      let verifierToUse = recaptchaVerifier;
      if (!verifierToUse) {
        // Try to reinitialize if not available
        console.log('reCAPTCHA verifier not available, attempting to reinitialize...');
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
        console.error('reCAPTCHA container not found');
        return {
          data: null,
          error: 'Security verification container not found. Please refresh the page.',
        };
      }

      console.log('Using recaptcha verifier, sending OTP...');
      console.log('Verifier details:', { 
        hasVerifier: !!verifierToUse,
        containerExists: !!container,
        authExists: !!auth 
      });
      
      const { signInWithPhoneNumber } = await import('firebase/auth');
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifierToUse);
      setConfirmationResult(confirmation);
      
      return { data: { success: true }, error: null };
    } catch (error: any) {
      // Log comprehensive error information
      console.error('Error sending OTP - Full Error Object:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error keys:', error ? Object.keys(error) : 'no keys');
      
      // Firebase errors can be Error instances or plain objects with code property
      const errorCode = error?.code || (error?.message?.includes('auth/') ? error.message : '') || '';
      const errorMessage = error?.message || error?.toString() || '';
      
      console.error('OTP Error Details:', { 
        code: errorCode, 
        message: errorMessage, 
        fullError: error,
        stack: error?.stack 
      });
      
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
              return { data: null, error: 'Security verification issue. Please refresh the page and try again.' };
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
  }, [auth, recaptchaVerifier, initializeRecaptcha]);

  const handleOTPVerify = useCallback(async (phone: string, token: string): Promise<AuthResponse> => {
    try {
      if (!confirmationResult) {
        console.log('OTP Verify: No confirmationResult available');
        return {
          data: null,
          error: 'No verification code was sent. Please request a new one.'
        };
      }

      console.log('OTP Verify: Attempting to verify code with confirmationResult');
      // Attempt to verify the code
      // Firebase allows multiple attempts with the same confirmationResult
      const result = await confirmationResult.confirm(token);
      console.log('OTP Verify: Code verified successfully', result?.user?.uid);
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
          if (auth) {
            const { signOut: firebaseSignOut } = await import('firebase/auth');
            await firebaseSignOut(auth);
          }
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
      
      console.log('OTP Verify Error Details:', { 
        errorCode, 
        errorMessageText: errorMessageText || error?.message,
        fullError: error 
      });
      
      switch (errorCode) {
        case 'auth/invalid-verification-code':
          errorMessage = 'Invalid code. Please check and try again.';
          // Don't clear confirmationResult for invalid code - user can try again
          shouldClearConfirmation = false;
          console.log('Invalid code - preserving confirmationResult for retry');
          break;
        case 'auth/code-expired':
          errorMessage = 'Code has expired. Please request a new one.';
          // Clear confirmationResult only when code expires
          shouldClearConfirmation = true;
          console.log('Code expired - clearing confirmationResult');
          break;
        case 'auth/session-expired':
          errorMessage = 'Session expired. Please request a new code.';
          shouldClearConfirmation = true;
          console.log('Session expired - clearing confirmationResult');
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please request a new code.';
          shouldClearConfirmation = true;
          console.log('Too many requests - clearing confirmationResult');
          break;
        default:
          // Check error message for expiration or session issues
          const message = errorMessageText || error?.message || '';
          if (message.toLowerCase().includes('expired') || 
              message.toLowerCase().includes('session')) {
            errorMessage = 'Session expired. Please request a new code.';
            shouldClearConfirmation = true;
            console.log('Session/expired detected in message - clearing confirmationResult');
          } else {
            // For other errors (including invalid code without specific code), don't clear confirmationResult
            // This allows user to retry with correct code after wrong attempts
            errorMessage = message || 'Invalid code. Please check and try again.';
            shouldClearConfirmation = false;
            console.log('Other error - preserving confirmationResult for retry');
          }
      }

      // Only clear confirmationResult if code expired, session expired, or too many attempts
      // This allows user to retry with correct code after wrong attempts (up to Firebase's limit)
      if (shouldClearConfirmation) {
        console.log('Clearing confirmationResult');
        setConfirmationResult(null);
      } else {
        console.log('Keeping confirmationResult for retry - user can try again');
      }
      
      return { data: null, error: errorMessage };
    }
  }, [auth, confirmationResult, mapFirebaseUser]);

  const handleSignOut = useCallback(async () => {
    try {
      setSigningOut(true);

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
    } catch (error) {
      console.error('Error during sign out:', error);
      setSigningOut(false);
      
      // Force cleanup on error
      setUser(null);
      setSession(null);
      window.location.href = '/';
    }
  }, [auth]);

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
      <div id="recaptcha-container" style={{ display: 'none' }}></div>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;