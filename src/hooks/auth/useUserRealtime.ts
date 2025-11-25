import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/utils/auth/types';

interface UseUserRealtimeProps {
  user: User | null;
  onUserDeleted: () => void;
  onUserDeactivated: () => void;
}

/**
 * Hook for subscribing to realtime updates for user profile (deletion/deactivation)
 */
export function useUserRealtime({ user, onUserDeleted, onUserDeactivated }: UseUserRealtimeProps) {
  const channelRef = useRef<Awaited<ReturnType<ReturnType<typeof createClient>['channel']>> | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      // Cleanup if user is null
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch {
          // Ignore unsubscribe errors
        }
        channelRef.current = null;
      }
      return;
    }

    const startRealtime = async () => {
      try {
        const supabase = createClient();
        const channel = supabase
          .channel(`user_profile_${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_profiles',
              filter: `id=eq.${userId}`,
            },
            async (payload) => {
              const record = payload.new || payload.old;
              if (!record || typeof record !== 'object') return;

              const recordTyped = record as { deleted_at?: string | null; is_active?: boolean };
              const isDeleted = recordTyped.deleted_at !== null && recordTyped.deleted_at !== undefined;
              const isDeactivated = 'is_active' in recordTyped && recordTyped.is_active === false;

              if (isDeleted) {
                onUserDeleted();
              } else if (isDeactivated) {
                onUserDeactivated();
              }
            }
          );

        await channel.subscribe();
        channelRef.current = channel as Awaited<ReturnType<ReturnType<typeof createClient>['channel']>>;
      } catch {
        // Realtime not available - silently fail
      }
    };

    startRealtime();

    return () => {
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch {
          // Ignore unsubscribe errors
        }
        channelRef.current = null;
      }
    };
  }, [user?.id, onUserDeleted, onUserDeactivated]);
}

