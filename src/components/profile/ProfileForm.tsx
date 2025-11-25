'use client';

import { useEffect, useRef } from 'react';
import TextInput from '@/components/profile-ui/TextInput';
import PhoneInput from '@/components/profile-ui/PhoneInput';
import FormActions from '@/components/profile-ui/FormActions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileFormProps {
  fullName: string;
  phone: string;
  created_at?: string | null;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  hasChanges: boolean;
}

export default function ProfileForm({
  fullName,
  phone,
  created_at,
  onFullNameChange,
  onPhoneChange,
  onSave,
  onCancel,
  saving,
  hasChanges,
}: ProfileFormProps) {
  const fullNameInputRef = useRef<HTMLInputElement>(null);

  // Autofocus fullName on mount
  useEffect(() => {
    if (fullNameInputRef.current) {
      fullNameInputRef.current.focus();
    }
  }, []);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="py-3 sm:py-4">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            ref={fullNameInputRef}
            id="fullName"
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        <PhoneInput
          label="Phone Number"
          value={phone}
          onChange={onPhoneChange}
        />

        {created_at && (
          <div className="space-y-2">
            <Label>Member Since</Label>
            <Input
              type="text"
              value={new Date(created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>
        )}
      </div>

      <div className="mt-6">
        <FormActions
          onCancel={onCancel}
          onSave={onSave}
          saving={saving}
          disabled={!hasChanges}
        />
      </div>
    </form>
  );
}
