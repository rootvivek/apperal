'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
}

export default function CheckboxField({
  label,
  checked,
  onCheckedChange,
  id,
  className,
}: CheckboxFieldProps) {
  const checkboxId = id || `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <Label
        htmlFor={checkboxId}
        className="text-sm font-normal cursor-pointer"
      >
        {label}
      </Label>
    </div>
  );
}

