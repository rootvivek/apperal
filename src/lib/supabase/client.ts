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
  
  // Create a chainable query builder
  const createQueryBuilder = () => {
    const builder = {
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      is: () => builder,
      in: () => builder,
      select: () => builder,
    };
    return builder;
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
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
        limit: () => Promise.resolve({ data: [], error: null }),
        is: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
  }
}