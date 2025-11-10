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
import { createClient } from '@/lib/supabase/client';
import { checkUserActiveStatus } from '@/lib/supabase/client-auth';

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
  showBannedModal: boolean;
  setBannedModal: (show: boolean) => void;
  bannedReason: 'deleted' | 'deactivated' | string;
  sendOTP: (phone: string) => Promise<any>;
  verifyOTP: (phone: string, token: string) => Promise<any>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signingOut: false,
  showBannedModal: false,
  setBannedModal: () => {},
  bannedReason: '',
  sendOTP: async () => ({ data: null, error: 'Not implemented' }),
  verifyOTP: async () => ({ data: null, error: 'Not implemented' }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [showBannedModal, setBannedModal] = useState(false);
  const [bannedReason, setBannedReason] = useState<'deleted' | 'deactivated' | string>('');
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
        .select('id, deleted_at')
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

      // If profile was deleted, sign out the user and show banned modal
      if (existingProfile && existingProfile.deleted_at) {
        console.warn('User profile was deleted. Signing out user:', userId);
        try {
          await signOut();
        } catch (signOutError) {
          console.error('Error signing out deleted user:', signOutError);
        }
        setUser(null);
        setSession(null);
        setBannedReason('deleted');
        setBannedModal(true);
        return;
      }

      // If profile exists but is deactivated (is_active === false), sign out and show deactivated modal
      if (existingProfile && 'is_active' in existingProfile && existingProfile.is_active === false) {
        console.warn('User profile is deactivated. Signing out user:', userId);
        try {
          await signOut();
        } catch (signOutError) {
          console.error('Error signing out deactivated user:', signOutError);
        }
        setUser(null);
        setSession(null);
        setBannedReason('deactivated');
        setBannedModal(true);
        return;
      }

      // If profile doesn't exist, create it
      if (!existingProfile) {
        const insertQuery = supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: userEmail, // Use generated email (always has a value)
            full_name: displayName,
            phone: userPhone,
          })
          .select();
        
        const insertResult = await insertQuery;

        // Check if there's an error
        if (insertResult.error) {
          const error = insertResult.error;
          
          // Access error properties directly
          const errorCode = error?.code || 'NO_CODE';
          const errorMessage = error?.message || 'NO_MESSAGE';
          
          // If insert fails (e.g., duplicate key), try to update instead
          if (errorCode === '23505') {
            // Duplicate key - profile was created by another process, just update it
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                email: userEmail, // Use generated email
                full_name: displayName,
                phone: userPhone,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);
          } else {
            // If it's an RLS policy error, try to fetch the profile (might have been created by trigger)
            if (errorCode === '42501' || errorMessage?.includes('policy') || errorMessage?.includes('RLS')) {
              const { data: existingProfile } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('id', userId)
                .maybeSingle();
              
            }
          }
        } else if (!insertResult.data?.length) {
          // Verify profile was created
          const { data: verifyProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
        }
      } else {
        // Profile exists, update it with latest Firebase data
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            email: userEmail, // Use generated email
            full_name: displayName,
            phone: userPhone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating user profile:', updateError);
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
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
  }, [auth]);

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
    };    if (user) {
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

  const sendOTP = async (phone: string) => {
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
          error: `Firebase is not configured. Missing environment variables: ${missingVars.join(', ')}. Please check your .env.local file or Netlify environment variables.`,
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
        const userId = result.user.uid;
        
        // Check user's active status before setting any state
        console.log('Checking user active status...');
        let isActive = true;
        try {
          const { isActive: activeStatus, error: statusError } = await checkUserActiveStatus(userId);
          isActive = activeStatus;
          
          if (statusError) {
            // Only log if it's not the expected deactivation message
            if (!statusError.includes('Account is deactivated or deleted')) {
              console.error('Error checking user status:', statusError);
            }
          }
        } catch (error) {
          // Only log unexpected errors
          if (error instanceof Error && !error.message.includes('deactivated')) {
            console.error('Failed to check user status:', error);
          }
        }

        if (!isActive) {
          // Set banned state first and ensure it's set
          setBannedReason('deactivated');
          setBannedModal(true);
          
          // Use a small delay to ensure state is set before clearing auth
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Clean up auth state quietly
          try {
            if (auth) await firebaseSignOut(auth);
          } catch (signOutError) {
            // Only log unexpected errors
            if (signOutError instanceof Error && !signOutError.message.includes('already signed out')) {
              console.error('Error during cleanup:', signOutError);
            }
          }
          
          // Clear user state
          setUser(null);
          setSession(null);
          
          // Return error but keep modal visible
          return { 
            data: null, 
            error: 'Your account has been deactivated or deleted. Please contact the administrator.' 
          };
        }

        // User is active, proceed with login
        const mappedUser = mapFirebaseUser(result.user);
        if (mappedUser) {
          setUser(mappedUser);
          setSession({
            user: mappedUser,
            expires_at: undefined,
          });
          
          // Set up user profile in Supabase
          console.log('Setting up user profile in Supabase...');
          const supabase = createClient();
          const userPhone = result.user.phoneNumber || phone || null;
          const displayName = result.user.displayName || 'User';
          
          // Generate email - use Firebase email if available, otherwise create placeholder from phone
          let userEmail = result.user.email || '';
          if (!userEmail && userPhone) {
            // Create placeholder email from phone number (email column is NOT NULL)
            const cleanPhone = userPhone.replace(/\D/g, ''); // Remove non-digits
            userEmail = `phone_${cleanPhone}@apperal.local`;
          } else if (!userEmail) {
            // Fallback if no phone either
            userEmail = `user_${userId.substring(0, 8)}@apperal.local`;
          }

          // Fetch existing profile for creation/update
          const { data: existingProfile, error: fetchError } = await supabase
            .from('user_profiles')
            .select('id, email, full_name, phone')
            .eq('id', userId)
            .maybeSingle();
      
          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking user profile:', {
              code: fetchError.code,
              message: fetchError.message,
              details: fetchError.details,
              hint: fetchError.hint,
              fullError: fetchError
            });
          }

          // If user doesn't exist, create it immediately
          if (!existingProfile) {
            console.log('User not found in Supabase, creating profile...');
            const insertQuery = supabase
              .from('user_profiles')
              .insert({
                id: userId,
                email: userEmail, // Now always has a value
                full_name: displayName,
                phone: userPhone,
              })
              .select('id');
            
            const { data: newProfile, error: createError } = await insertQuery;

            if (createError) {
              // If duplicate key error, profile was created by another process
              if (createError.code === '23505') {
                console.log('Profile already exists (duplicate key), updating...');
                await supabase
                  .from('user_profiles')
                  .update({
                    email: userEmail, // Use generated email
                    full_name: displayName,
                    phone: userPhone,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', userId);
                console.log('User profile updated successfully');
              } else {
                console.error('Error creating user profile:', {
                  code: createError.code,
                  message: createError.message,
                  details: createError.details,
                  hint: createError.hint
                });
                // Continue anyway - profile might be created by trigger or another process
              }
            } else if (newProfile && (Array.isArray(newProfile) ? newProfile.length > 0 : newProfile)) {
              console.log('✅ User profile created successfully in Supabase:', userId);
            }
          } else {
            console.log('✅ User profile already exists in Supabase:', userId);
            // Update profile with latest Firebase data
            await supabase
              .from('user_profiles')
              .update({
                email: userEmail, // Use generated email
                full_name: displayName,
                phone: userPhone,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);
          }
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
    showBannedModal,
    setBannedModal,
    bannedReason,
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
