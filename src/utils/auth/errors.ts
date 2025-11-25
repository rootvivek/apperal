'use client';

export interface FirebaseError {
  code?: string;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * Formats Firebase authentication errors into human-readable messages
 */
export function formatAuthError(error: FirebaseError | Error | string | unknown): string {
  let errorCode = '';
  let errorMessage = '';

  // Extract error code and message from various error formats
  if (typeof error === 'string') {
    errorMessage = error;
    const codeMatch = error.match(/auth\/[a-z-]+/i);
    if (codeMatch) {
      errorCode = codeMatch[0];
    }
  } else if (error && typeof error === 'object') {
    const err = error as FirebaseError;
    errorCode = err.code || err.error?.code || '';
    errorMessage = err.message || err.error?.message || '';
    
    // Try to extract code from message if not found
    if (!errorCode && errorMessage) {
      const codeMatch = errorMessage.match(/auth\/[a-z-]+/i);
      if (codeMatch) {
        errorCode = codeMatch[0];
      }
    }
  }

  // Check for quota/limit errors first (can appear in different codes)
  // This must be checked before any other error handling to avoid duplicate messages
  const isQuotaError =
    errorCode === 'auth/quota-exceeded' ||
    errorCode === 'auth/too-many-requests' ||
    errorMessage.toLowerCase().includes('quota') ||
    errorMessage.toLowerCase().includes('limit') ||
    errorMessage.toLowerCase().includes('exceeded') ||
    (errorMessage.toLowerCase().includes('sms') && errorMessage.toLowerCase().includes('limit'));

  if (isQuotaError) {
    return 'SMS OTP limit reached. The daily quota for sending verification codes has been exceeded. Please try again tomorrow or contact support if you need immediate access.';
  }

  // Handle specific error codes
  switch (errorCode) {
    case 'auth/invalid-phone-number':
      return 'Invalid phone number format. Please check and try again.';
    
    case 'auth/captcha-check-failed':
      return 'Security verification failed. Please refresh the page and try again.';
    
    case 'auth/invalid-app-credential':
      // Quota errors already handled above, so this is a config error
      return 'Firebase configuration error. Please ensure your domain is authorized in Firebase Console (Authentication > Settings > Authorized domains).';
    
    case 'auth/app-not-authorized':
      return 'App not authorized. Please contact support.';
    
    case 'auth/invalid-verification-code':
      return 'Invalid code. Please check and try again.';
    
    case 'auth/code-expired':
      return 'Code has expired. Please request a new one.';
    
    case 'auth/session-expired':
      return 'Session expired. Please request a new code.';
    
    default:
      // Check error message for useful info
      if (errorMessage) {
        if (errorMessage.toLowerCase().includes('captcha')) {
          return 'Security verification issue. Please try again - the verification has been reset.';
        }
        if (errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('session')) {
          return 'Session expired. Please request a new code.';
        }
        // Quota errors already handled above, so this is a generic error
        return `Failed to process request. ${errorMessage}`;
      }
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Checks if an error requires clearing the confirmation result
 */
export function shouldClearConfirmation(error: FirebaseError | Error | string | unknown): boolean {
  let errorCode = '';
  
  if (typeof error === 'string') {
    const codeMatch = error.match(/auth\/[a-z-]+/i);
    if (codeMatch) {
      errorCode = codeMatch[0];
    }
  } else if (error && typeof error === 'object') {
    const err = error as FirebaseError;
    errorCode = err.code || err.error?.code || '';
    
    if (!errorCode) {
      const message = err.message || err.error?.message || '';
      const codeMatch = message.match(/auth\/[a-z-]+/i);
      if (codeMatch) {
        errorCode = codeMatch[0];
      }
    }
  }

  // Clear confirmation for expired codes, session expired, or too many requests
  return (
    errorCode === 'auth/code-expired' ||
    errorCode === 'auth/session-expired' ||
    errorCode === 'auth/too-many-requests'
  );
}

