import { useState, useMemo, useCallback } from 'react';
import { normalizePhone } from '@/utils/phone';
import type { UserProfile } from './useProfileData';

interface UseProfileFormProps {
  profile: UserProfile | null;
}

interface UseProfileFormReturn {
  fullName: string;
  phone: string;
  setFullName: (name: string) => void;
  setPhone: (phone: string) => void;
  hasChanges: boolean;
  resetForm: () => void;
}

/**
 * Hook for managing profile form state and validation
 */
export function useProfileForm({ profile }: UseProfileFormProps): UseProfileFormReturn {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Initialize form when profile loads
  const resetForm = useCallback(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone ? String(profile.phone) : '');
    }
  }, [profile]);

  // Check if profile has changes
  const hasChanges = useMemo(() => {
    if (!profile) return false;
    const phoneStr = typeof phone === 'string' ? phone : '';
    const normalizedPhone = phoneStr.trim() ? normalizePhone(phoneStr.trim()) : null;
    const normalizedProfilePhone = profile.phone ? normalizePhone(String(profile.phone)) : null;
    
    return (
      (fullName.trim() || '') !== (profile.full_name || '') ||
      normalizedPhone !== normalizedProfilePhone
    );
  }, [fullName, phone, profile]);

  return {
    fullName,
    phone,
    setFullName,
    setPhone,
    hasChanges,
    resetForm,
  };
}

