import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If no environment variables, return a mock client
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found. Using mock client.')
    return createMockClient()
  }

  // Check if the URL looks like a valid Supabase URL
  if (!supabaseUrl.includes('.supabase.co') || supabaseUrl.includes('your-project-id')) {
    console.warn('Invalid Supabase URL detected. Using mock client.')
    console.warn('Please update your .env.local file with your real Supabase project URL.')
    return createMockClient()
  }

  // Return real Supabase client
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

function createMockClient() {
  let authStateCallback: ((event: string, session: any) => void) | null = null;
  
  // Create a chainable query builder that returns a Promise
  const createQueryBuilder = () => {
    const builder = {
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      is: () => builder,
      in: () => builder,
      select: () => builder,
    };
    
    // Make it a proper Promise
    const promise = Promise.resolve({ data: [], error: null });
    Object.setPrototypeOf(builder, promise);
    return builder as any;
  };
  
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: () => { authStateCallback = null; } } } };
      },
      signUp: () => Promise.resolve({ 
        data: null, 
        error: { 
          message: 'Please set up your Supabase project first. Visit supabase.com to create a project and update your .env.local file.' 
        } 
      }),
      signInWithPassword: () => Promise.resolve({ 
        data: null, 
        error: { 
          message: 'Please set up your Supabase project first. Visit supabase.com to create a project and update your .env.local file.' 
        } 
      }),
      signOut: () => {
        // Trigger auth state change for mock client
        if (authStateCallback) {
          setTimeout(() => authStateCallback!('SIGNED_OUT', null), 100);
        }
        return Promise.resolve({ error: null });
      },
      signInWithOAuth: () => Promise.resolve({ 
        data: null, 
        error: { 
          message: 'Please set up your Supabase project first. Visit supabase.com to create a project and update your .env.local file.' 
        } 
      }),
      signInWithOtp: () => Promise.resolve({ 
        data: null, 
        error: { 
          message: 'Please set up your Supabase project first. Visit supabase.com to create a project and update your .env.local file.' 
        } 
      }),
      verifyOtp: () => Promise.resolve({ 
        data: null, 
        error: { 
          message: 'Please set up your Supabase project first. Visit supabase.com to create a project and update your .env.local file.' 
        } 
      }),
    },
    from: () => ({
      select: () => createQueryBuilder(),
      insert: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  }
}