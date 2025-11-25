'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoginOTP } from '@/hooks/useLoginOTP';
import { formatPhoneForInput } from '@/utils/phone';
import { Spinner } from '@/components/ui/spinner';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export default function LoginModal({ isOpen, onClose, redirectTo }: LoginModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const {
    step,
    phone,
    otp,
    error,
    isSending,
    isVerifying,
    secondsLeft,
    setPhone,
    setOtp,
    sendOtp,
    resendOtp,
    verifyOtp,
    resetState,
    backToPhone,
  } = useLoginOTP();

  // Handle successful login: close modal and redirect
  useEffect(() => {
    if (user && isOpen) {
      resetState();
      onClose();
      setTimeout(() => {
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      }, 100);
    }
  }, [user, isOpen, onClose, redirectTo, router, resetState]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = formatPhoneForInput(e.target.value);
    setPhone(cleaned);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length === 10 && !isSending) {
      sendOtp();
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6 && !isVerifying) {
      verifyOtp();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && step === 'phone' && phone.length === 10 && !isSending) {
      e.preventDefault();
      sendOtp();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={step === 'otp' ? () => {} : onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step === 'phone' ? 'Welcome back' : 'Verify OTP'}</DialogTitle>
          <DialogDescription>
            {step === 'phone' 
              ? 'Enter your phone number to continue' 
              : 'We sent a code to your phone'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="Enter 10-digit number"
                value={phone}
                onChange={handlePhoneChange}
                onKeyDown={handleKeyDown}
                maxLength={10}
                disabled={isSending}
                required
                style={{ borderRadius: '8px' }}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={phone.length !== 10 || isSending}
            >
              {isSending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500 mb-1">OTP sent to</p>
              <p className="text-sm font-medium">+91 {phone}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">Enter OTP</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                onChange={handleOtpChange}
                maxLength={6}
                disabled={isVerifying}
                className="text-center text-lg tracking-widest"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={backToPhone}
              >
                Change number
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resendOtp}
                disabled={secondsLeft > 0 || isVerifying}
              >
                {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend OTP'}
              </Button>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={otp.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
