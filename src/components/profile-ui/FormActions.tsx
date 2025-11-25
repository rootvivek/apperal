'use client';

import { Button } from '@/components/ui/button';

interface FormActionsProps {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
}

export default function FormActions({
  onCancel,
  onSave,
  saving = false,
  saveLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  disabled = false,
}: FormActionsProps) {
  return (
    <div className="flex justify-end space-x-4">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
      >
        {cancelLabel}
      </Button>
      <Button
        type="button"
        onClick={onSave}
        disabled={saving || disabled}
      >
        {saving ? 'Saving...' : saveLabel}
      </Button>
    </div>
  );
}

