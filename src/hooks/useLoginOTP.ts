'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { normalizePhone, validatePhone, formatPhoneForInput } from '@/utils/phone';
import { ensureMSG91Ready } from '@/lib/msg91';

export type LoginStep = 'phone' | 'otp';

interface UseLoginOTPReturn {
  step: LoginStep;
  phone: string;
  otp: string;
  error: string;
  isSending: boolean;
  isVerifying: boolean;
  secondsLeft: number;
  otpSent: boolean;
  setPhone: (phone: string) => void;
  setOtp: (otp: string) => void;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<{ 'access-token'?: string; accessToken?: string; phone?: string }>;
  resendOtp: () => Promise<void>;
  resetState: () => void;
  backToPhone: () => void;
}

const RESEND_COOLDOWN_SECONDS = 30;

export const useLoginOTP = (): UseLoginOTPReturn => {
  const [step, setStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [reqId, setReqId] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    if (secondsLeft <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [secondsLeft]);

  const handleSetPhone = useCallback((value: string) => {
    const cleaned = formatPhoneForInput(value);
    setPhone(cleaned);
    setError('');
  }, []);

  const handleSetOtp = useCallback((value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setOtp(cleaned);
    setError('');
  }, []);

  // Send OTP using MSG91 widget exposed method
  const sendOtp = useCallback(async (phoneNumber: string) => {
    const normalized = normalizePhone(phoneNumber);
    if (!validatePhone(normalized).isValid) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError('');
    setIsSending(true);

    try {
      await ensureMSG91Ready();
      
      const formattedPhone = `91${normalized}`;
      
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          setIsSending(false);
          reject(new Error('OTP request timed out. Please try again.'));
        }, 30000);
        
        window.sendOtp!(
          formattedPhone,
          (data: any) => {
            clearTimeout(timeoutId);
            setReqId(data?.request_id || data?.reqId || data?.sessionId || null);
            setOtpSent(true);
            setStep('otp');
            setSecondsLeft(RESEND_COOLDOWN_SECONDS);
            setIsSending(false);
            resolve();
          },
          (error: any) => {
            clearTimeout(timeoutId);
            setIsSending(false);
            const errorMsg = error?.message || error?.toString() || 'Failed to send OTP. Please try again.';
            setError(errorMsg);
            reject(new Error(errorMsg));
          }
        );
      });
    } catch (err: any) {
      setIsSending(false);
      setError(err?.message || 'Failed to send OTP. Please try again.');
    }
  }, []);

  // Extract access token from MSG91 response
  const extractAccessToken = (data: any): string | null => {
    // Check standard fields
    let token = data?.['access-token'] || data?.accessToken || data?.token || data?.access_token || data?.jwt_token;
    
    // Check 'message' field for JWT token
    if (!token && data?.message && typeof data.message === 'string') {
      const message = data.message;
      if (message.startsWith('eyJ') && message.split('.').length === 3) {
        token = message;
      }
    }
    
    return token || null;
  };

  // Verify OTP using MSG91 widget exposed method
  const verifyOtp = useCallback(async (otpValue: string): Promise<{ 'access-token'?: string; accessToken?: string; phone?: string }> => {
    if (!otpSent || !phone) {
      throw new Error('OTP not sent. Please send OTP first.');
    }

    if (otpValue.length !== 4 && otpValue.length !== 6) {
      throw new Error('OTP must be 4 or 6 digits');
    }

    setError('');
    setIsVerifying(true);

    try {
      await ensureMSG91Ready();

      return new Promise<{ 'access-token'?: string; accessToken?: string; phone?: string }>((resolve, reject) => {
        window.verifyOtp!(
          otpValue,
          (data: any) => {
            const accessToken = extractAccessToken(data);
            if (!accessToken) {
              setIsVerifying(false);
              setError('No access token received from MSG91. Please try again.');
              reject(new Error('No access token received'));
              return;
            }
            
            setIsVerifying(false);
            resolve({
              'access-token': accessToken,
              accessToken: accessToken,
              phone: phone,
            });
          },
          (error: any) => {
            setIsVerifying(false);
            const errorCode = error?.code;
            const errorMessage = error?.message || error?.error || error?.toString() || 'Invalid OTP. Please try again.';
            
            if (errorCode === 703 || errorMessage.toLowerCase().includes('already verif')) {
              setOtpSent(false);
              setStep('phone');
              setError('This OTP has already been used. Please request a new OTP.');
            } else {
              setError(errorMessage);
            }
            reject(new Error(errorMessage));
          },
          reqId || undefined
        );
      });
    } catch (err: any) {
      setIsVerifying(false);
      throw err;
    }
  }, [otpSent, phone, reqId]);

  const resendOtp = useCallback(async () => {
    if (secondsLeft > 0 || !phone) return;

    setError('');
    setIsSending(true);
    setOtp('');

    try {
      await ensureMSG91Ready();
      const formattedPhone = `91${normalizePhone(phone)}`;
      
      await new Promise<void>((resolve, reject) => {
        window.sendOtp!(
          formattedPhone,
          (data: any) => {
            setReqId(data?.request_id || data?.reqId || data?.sessionId || null);
            setSecondsLeft(RESEND_COOLDOWN_SECONDS);
            setIsSending(false);
            resolve();
          },
          (error: any) => {
            setIsSending(false);
            const errorMsg = error?.message || error?.toString() || 'Failed to resend OTP. Please try again.';
            setError(errorMsg);
            reject(new Error(errorMsg));
          }
        );
      });
    } catch (err: any) {
      setIsSending(false);
      setError(err?.message || 'Failed to resend OTP. Please try again.');
    }
  }, [phone, secondsLeft]);

  const resetState = useCallback(() => {
    setStep('phone');
    setPhone('');
    setOtp('');
    setError('');
    setIsSending(false);
    setIsVerifying(false);
    setSecondsLeft(0);
    setOtpSent(false);
    setReqId(null);
  }, []);

  const backToPhone = useCallback(() => {
    setStep('phone');
    setError('');
    setOtp('');
  }, []);

  return {
    step,
    phone,
    otp,
    error,
    isSending,
    isVerifying,
    secondsLeft,
    otpSent,
    setPhone: handleSetPhone,
    setOtp: handleSetOtp,
    sendOtp,
    verifyOtp,
    resendOtp,
    resetState,
    backToPhone,
  };
};
