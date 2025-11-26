'use client';

export interface User {
  id: string;
  phone?: string | null;
  user_metadata?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
}

export interface Session {
  user: User;
  expires_at?: number;
}

export interface AuthResponse {
  data: { success?: boolean; user?: User; reqId?: string } | null;
  error: string | null;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  banned: {
    show: boolean;
    reason: 'deleted' | 'deactivated' | string;
  };
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  banned: {
    show: boolean;
    reason: 'deleted' | 'deactivated' | string;
  };
  signingOut: boolean;
  loginWithToken: (accessToken: string, phone?: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
}

export interface ProfileData {
  id: string;
  full_name: string;
  phone: string | null;
  deleted_at?: string | null;
  is_active?: boolean;
}

