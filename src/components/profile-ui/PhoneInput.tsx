'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPhoneForInput, formatPhoneForDisplay } from '@/utils/phone';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  showPreview?: boolean;
}

export default function PhoneInput({
  label,
  value,
  onChange,
  error,
  showPreview = true,
  className,
  id,
  ...props
}: PhoneInputProps) {
  const inputId = id || 'phone-input';

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className={cn(error && 'text-destructive')}>
        {label}
      </Label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-muted-foreground text-sm">+91</span>
        </div>
        <Input
          id={inputId}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => {
            const cleaned = formatPhoneForInput(e.target.value);
            onChange(cleaned);
          }}
          className={cn('pl-10', error && 'border-destructive', className)}
          maxLength={10}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {showPreview && value && value.length === 10 && (
        <p className="text-xs text-muted-foreground">
          {formatPhoneForDisplay(value)}
        </p>
      )}
    </div>
  );
}

