'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { normalizePhone, validatePhone, formatPhoneForInput } from '@/utils/phone';

// Validation schemas
const phoneSchema = z.string().refine((val) => {
  const normalized = normalizePhone(val);
  const validation = validatePhone(normalized);
  return validation.isValid;
}, { message: 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9' });
const otpSchema = z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits');

export type LoginStep = 'phone' | 'otp';

interface UseLoginOTPReturn {
  // State
  step: LoginStep;
  phone: string;
  otp: string;
  error: string;
  isSending: boolean;
  isVerifying: boolean;
  secondsLeft: number;
  
  // Actions
  setPhone: (phone: string) => void;
  setOtp: (otp: string) => void;
  sendOtp: () => Promise<void>;
  resendOtp: () => Promise<void>;
  verifyOtp: () => Promise<void>;
  resetState: () => void;
  backToPhone: () => void;
}

const RESEND_COOLDOWN_SECONDS = 30;

export function useLoginOTP(): UseLoginOTPReturn {
  const { sendOTP, verifyOTP } = useAuth();
  
  // State
  const [step, setStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  
  // Refs for timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Normalize phone number for MSG91 (returns 10 digits, AuthContext adds +91)
  const getNormalizedPhone = useCallback((phoneDigits: string): string => {
    return normalizePhone(phoneDigits);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer countdown for resend cooldown
  useEffect(() => {
    if (secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [secondsLeft]);

  // Handle phone input change - normalize input
  const handleSetPhone = useCallback((value: string) => {
    const cleaned = formatPhoneForInput(value);
    setPhone(cleaned);
    setError('');
  }, []);

  // Handle OTP input change - only allow digits
  const handleSetOtp = useCallback((value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 6) {
      setOtp(cleaned);
      setError('');
    }
  }, []);

  // Send OTP
  const sendOtp = useCallback(async () => {
    // Validate phone
    const validation = phoneSchema.safeParse(phone);
    if (!validation.success) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError('');
    setIsSending(true);

    try {
      const normalizedPhone = getNormalizedPhone(phone);
      const { data, error: otpError } = await sendOTP(normalizedPhone);
      
      if (otpError) {
        setError(otpError);
        setIsSending(false);
      } else {
        setStep('otp');
        setSecondsLeft(RESEND_COOLDOWN_SECONDS);
        setIsSending(false);
      }
    } catch (err: any) {
      setError('Failed to send OTP. Please try again.');
      setIsSending(false);
    }
  }, [phone, sendOTP, getNormalizedPhone]);

  // Resend OTP
  const resendOtp = useCallback(async () => {
    if (secondsLeft > 0) {
      return; // Still in cooldown
    }

    // Validate phone
    const validation = phoneSchema.safeParse(phone);
    if (!validation.success) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError('');
    setIsSending(true);
    setOtp(''); // Clear current OTP

    try {
      const normalizedPhone = getNormalizedPhone(phone);
      const { data, error: otpError } = await sendOTP(normalizedPhone);
      
      if (otpError) {
        setError(otpError);
        setIsSending(false);
      } else {
        setSecondsLeft(RESEND_COOLDOWN_SECONDS);
        setIsSending(false);
      }
    } catch (err: any) {
      setError('Failed to resend OTP. Please try again.');
      setIsSending(false);
    }
  }, [phone, secondsLeft, sendOTP, getNormalizedPhone]);

  // Verify OTP
  const verifyOtp = useCallback(async () => {
    // Validate OTP
    const validation = otpSchema.safeParse(otp);
    if (!validation.success) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setError('');
    setIsVerifying(true);

    try {
      const normalizedPhone = getNormalizedPhone(phone);
      const { data, error: verifyError } = await verifyOTP(normalizedPhone, otp);
      
      if (verifyError) {
        setError(verifyError);
        setIsVerifying(false);
      } else {
        setIsVerifying(false);
      }
    } catch (err: any) {
      setError('Failed to verify OTP. Please try again.');
      setIsVerifying(false);
    }
  }, [phone, otp, verifyOTP, getNormalizedPhone]);

  // Auto-submit when OTP reaches 6 digits
  useEffect(() => {
    if (otp.length === 6 && step === 'otp' && !isVerifying) {
      verifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step, isVerifying]);

  // Reset all state
  const resetState = useCallback(() => {
    setStep('phone');
    setPhone('');
    setOtp('');
    setError('');
    setIsSending(false);
    setIsVerifying(false);
    setSecondsLeft(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Go back to phone step
  const backToPhone = useCallback(() => {
    setStep('phone');
    setOtp('');
    setError('');
    setSecondsLeft(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    step,
    phone,
    otp,
    error,
    isSending,
    isVerifying,
    secondsLeft,
    setPhone: handleSetPhone,
    setOtp: handleSetOtp,
    sendOtp,
    resendOtp,
    verifyOtp,
    resetState,
    backToPhone,
  };
}

