import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';

// Validate Firebase environment variables
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => {
    // Convert camelCase to UPPER_SNAKE_CASE
    const snakeCase = key.replace(/([A-Z])/g, '_$1').toUpperCase();
    return `NEXT_PUBLIC_FIREBASE_${snakeCase}`;
  });

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey || '',
  authDomain: requiredEnvVars.authDomain || '',
  projectId: requiredEnvVars.projectId || '',
  storageBucket: requiredEnvVars.storageBucket || '',
  messagingSenderId: requiredEnvVars.messagingSenderId || '',
  appId: requiredEnvVars.appId || '',
};

// Lazy-load Firebase - only initialize when actually needed
let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let initPromise: Promise<{ app: FirebaseApp; auth: Auth } | null> | null = null;

async function initializeFirebase(): Promise<{ app: FirebaseApp; auth: Auth } | null> {
  // Only initialize on client side
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing instance if already initialized
  if (app && authInstance) {
    return { app, auth: authInstance };
  }

  // Return existing promise if initialization is in progress
  if (initPromise) {
    return initPromise;
  }

  // Check for missing environment variables
  if (missingVars.length > 0) {
    // Missing environment variables - Firebase will not initialize
    return null;
  }

  if (!requiredEnvVars.apiKey) {
    return null;
  }

  // Start initialization
  initPromise = (async () => {
    try {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');

      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }
      authInstance = getAuth(app);
      
      return { app, auth: authInstance };
    } catch {
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

// Lazy getter for auth - initializes Firebase on first access
export async function getAuth(): Promise<Auth | null> {
  const result = await initializeFirebase();
  return result?.auth || null;
}

// Lazy getter for app - initializes Firebase on first access
export async function getApp(): Promise<FirebaseApp | null> {
  const result = await initializeFirebase();
  return result?.app || null;
}

// Legacy export for backward compatibility (returns null initially, will be set after init)
export const auth: Auth | null = null;

export default null;

