'use client';

import { useRef, useEffect } from 'react';

interface OtpStepProps {
  phone: string;
  otp: string;
  onOtpChange: (value: string) => void;
  onVerifyOtp: () => void;
  onBackToPhone: () => void;
  onResendOtp: () => void;
  isVerifying: boolean;
  secondsLeft: number;
  error?: string;
}

export default function OtpStep({
  phone,
  otp,
  onOtpChange,
  onVerifyOtp,
  onBackToPhone,
  onResendOtp,
  isVerifying,
  secondsLeft,
  error,
}: OtpStepProps) {
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Autofocus on mount
  useEffect(() => {
    if (otpInputRef.current) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onOtpChange(value);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cleaned = pastedText.replace(/\D/g, '').slice(0, 6);
    if (cleaned.length > 0) {
      onOtpChange(cleaned);
      // Auto-submit if 6 digits pasted
      if (cleaned.length === 6) {
        setTimeout(() => {
          onVerifyOtp();
        }, 100);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only allow numbers
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
      e.preventDefault();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6 && !isVerifying) {
      onVerifyOtp();
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600">
            OTP sent to <span className="font-medium text-gray-900">+91 {phone}</span>
          </p>
          <button
            type="button"
            onClick={onBackToPhone}
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            Edit phone number
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
          Enter OTP
        </label>
        <div className="mt-1">
          <input
            ref={otpInputRef}
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            value={otp}
            onChange={handleChange}
            onPaste={handlePaste}
            onKeyPress={handleKeyPress}
            className="appearance-none block w-full px-3 py-2 border border-gray-300/50 bg-white/50 backdrop-blur-sm rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-lg tracking-widest"
            placeholder="000000"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onResendOtp}
          disabled={secondsLeft > 0 || isVerifying}
          className="text-sm text-blue-600 hover:text-blue-500 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend OTP'}
        </button>
      </div>

      <button
        type="submit"
        disabled={isVerifying || otp.length !== 6}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isVerifying ? 'Verifying...' : 'Verify OTP'}
      </button>
    </form>
  );
}

