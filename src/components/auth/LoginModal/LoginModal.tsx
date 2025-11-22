'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '../../Modal';
import { cn } from '@/lib/utils';
import { useLoginOTP } from '../useLoginOTP';
import PhoneStep from './PhoneStep';
import OtpStep from './OtpStep';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string; // Kept for compatibility but not used for redirects
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { user } = useAuth();
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

  // Close modal if user logs in (stay on same page)
  useEffect(() => {
    if (user && isOpen) {
      onClose();
      // Stay on the same page - no redirect needed
    }
  }, [user, isOpen, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  // Handle OTP verification success - close modal
  useEffect(() => {
    if (user && step === 'otp') {
      onClose();
    }
  }, [user, step, onClose]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      className={cn(
        "bg-white/90 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-2xl py-8 px-4 sm:px-10",
        "max-w-lg"
      )}
      overlayClassName="bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-lg"
    >
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">
          Sign in or create account
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {step === 'phone' ? (
        <PhoneStep
          phone={phone}
          onPhoneChange={setPhone}
          onSendOtp={sendOtp}
          isSending={isSending}
          error={error}
        />
      ) : (
        <OtpStep
          phone={phone}
          otp={otp}
          onOtpChange={setOtp}
          onVerifyOtp={verifyOtp}
          onBackToPhone={backToPhone}
          onResendOtp={resendOtp}
          isVerifying={isVerifying}
          secondsLeft={secondsLeft}
          error={error}
        />
      )}
    </Modal>
  );
}

