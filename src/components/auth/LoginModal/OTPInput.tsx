'use client';

interface OTPInputProps {
  digit: string;
  index: number;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent) => void;
  disabled?: boolean;
  resendKey?: number;
}

export default function OTPInput({
  digit,
  index,
  onChange,
  onKeyDown,
  disabled = false,
  resendKey = 0,
}: OTPInputProps) {
  return (
    <input
      key={`${resendKey}-${index}`}
      id={`otp-${index}`}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={digit}
      onChange={(e) => onChange(index, e.target.value)}
      onKeyDown={(e) => onKeyDown(index, e)}
      className="w-full aspect-square text-center text-2xl border border-gray-300 rounded-lg focus:outline-none transition-all"
      style={{
        borderColor: digit ? '#D7882B' : '',
        boxShadow: digit ? '0 0 0 3px rgba(215, 136, 43, 0.1)' : ''
      }}
      disabled={disabled}
    />
  );
}

