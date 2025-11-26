'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Smartphone, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginOTP } from '@/hooks/useLoginOTP';
import { formatPhoneForInput } from '@/utils/phone';
import { loadMSG91Script } from '@/lib/msg91';
import AnimatedBlobs from './AnimatedBlobs';
import OTPInput from './OTPInput';
import AnimatedButton from './AnimatedButton';
import LoginHeader from './LoginHeader';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export default function LoginModal({ isOpen, onClose, redirectTo }: LoginModalProps) {
  const { user, loginWithToken } = useAuth();
  const router = useRouter();
  const {
    step,
    phone,
    otp,
    error,
    isSending,
    isVerifying,
    secondsLeft,
    otpSent,
    setPhone,
    setOtp,
    sendOtp,
    verifyOtp,
    resendOtp,
    resetState,
    backToPhone,
  } = useLoginOTP();

  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [resendKey, setResendKey] = useState(0);
  const autoSubmitRef = useRef(false);
  const lastAutoSubmittedOtpRef = useRef<string>('');
  const modalContentRef = useRef<HTMLDivElement>(null);

  const EMPTY_OTP = ['', '', '', ''] as const;
  const OTP_LENGTH = 4;

  // Animation variants
  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const slideVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  };

  // Helper: Clear OTP fields and reset flags
  const clearOtpFields = useCallback(() => {
    setOtp('');
    setOtpDigits([...EMPTY_OTP]);
    autoSubmitRef.current = false;
    lastAutoSubmittedOtpRef.current = '';
  }, []);

  // Helper: Focus first OTP input
  const focusFirstOtpInput = useCallback(() => {
    setTimeout(() => {
      document.getElementById('otp-0')?.focus();
    }, 100);
  }, []);

  // Helper: Verify OTP and login
  const verifyAndLogin = useCallback(async (otpValue: string) => {
    const result = await verifyOtp(otpValue);
    const accessToken = result['access-token'] || result.accessToken;
    if (accessToken) {
      await loginWithToken(accessToken, result.phone || phone);
    }
  }, [verifyOtp, loginWithToken, phone]);

  // Preload MSG91 script when modal opens
  useEffect(() => {
    if (isOpen && step === 'phone') {
      loadMSG91Script().catch(() => {});
    }
  }, [isOpen, step]);

  // Handle successful login
  useEffect(() => {
    if (user && isOpen) {
      resetState();
      onClose();
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    }
  }, [user, isOpen, onClose, redirectTo, router, resetState]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetState();
      clearOtpFields();
    }
  }, [isOpen, resetState, clearOtpFields]);

  // Sync OTP digits with otp string
  useEffect(() => {
    if (step === 'otp') {
      const digits = otp.split('').slice(0, OTP_LENGTH);
      setOtpDigits([...Array(OTP_LENGTH)].map((_, i) => digits[i] || ''));
    } else {
      setOtpDigits([...EMPTY_OTP]);
    }
  }, [otp, step]);

  // Auto-submit OTP when 4 digits are entered
  useEffect(() => {
    if (step !== 'otp' || otp.length !== OTP_LENGTH || isVerifying || !otpSent || autoSubmitRef.current) {
      if (otp.length !== OTP_LENGTH) {
        autoSubmitRef.current = false;
        if (otp.length < OTP_LENGTH) {
          lastAutoSubmittedOtpRef.current = '';
        }
      }
      return;
    }

    // Prevent auto-submit if this OTP was already tried
    if (lastAutoSubmittedOtpRef.current === otp) {
      return;
    }
    
    autoSubmitRef.current = true;
    lastAutoSubmittedOtpRef.current = otp;
    
    const timer = setTimeout(async () => {
      if (otp.length !== OTP_LENGTH || isVerifying) return;
      try {
        await verifyAndLogin(otp);
      } catch {
        clearOtpFields();
        focusFirstOtpInput();
      }
    }, 150);
    
    return () => clearTimeout(timer);
  }, [otp, step, isVerifying, otpSent, verifyAndLogin, clearOtpFields, focusFirstOtpInput]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length === 10) {
      await sendOtp(phone);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d/.test(value)) return;
    
    const digit = value.slice(-1);
    const newOtp = [...otpDigits];
    newOtp[index] = digit;
    setOtpDigits(newOtp);
    setOtp(newOtp.join(''));

    // Auto focus next
    if (digit && index < OTP_LENGTH - 1) {
      requestAnimationFrame(() => {
        document.getElementById(`otp-${index + 1}`)?.focus();
      });
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key !== 'Backspace') return;
    
    const newOtp = [...otpDigits];
    if (otpDigits[index]) {
      newOtp[index] = '';
    } else if (index > 0) {
      newOtp[index - 1] = '';
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
    setOtpDigits(newOtp);
    setOtp(newOtp.join(''));
  };

  const handleOtpSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== OTP_LENGTH || isVerifying) return;

    try {
      await verifyAndLogin(otp);
    } catch {
      clearOtpFields();
      focusFirstOtpInput();
    }
  };

  const handleResendOtp = async () => {
    clearOtpFields();
    setResendKey(prev => prev + 1);
    
    try {
      await resendOtp();
      clearOtpFields();
      setTimeout(() => {
        const firstInput = document.getElementById('otp-0') as HTMLInputElement;
        firstInput?.focus();
      }, 50);
    } catch {
      // Error handled in hook
    }
  };

  // Handle click outside to close modal
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-gradient-to-br from-orange-50 via-amber-50 to-slate-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <AnimatedBlobs />

      <motion.div
        ref={modalContentRef}
        className="w-full max-w-md relative"
        initial="hidden"
        animate="visible"
        variants={contentVariants}
        transition={{ duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden backdrop-blur-lg border border-gray-100">
          <LoginHeader step={step} />

          {/* Content */}
          <div className="p-8">
            {error && (
              <motion.div
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {step === 'phone' && (
                <motion.div
                  key="phone"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={slideVariants}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handlePhoneSubmit}>
                    <div className="mb-6">
                      <label htmlFor="phone" className="block text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <input
                          id="phone"
                          type="tel"
                          inputMode="numeric"
                          value={phone}
                          onChange={(e) => setPhone(formatPhoneForInput(e.target.value))}
                          placeholder="Enter 10-digit number"
                          className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none transition-all"
                          style={{
                            borderColor: phone ? '#D7882B' : '',
                            boxShadow: phone ? '0 0 0 3px rgba(215, 136, 43, 0.1)' : ''
                          }}
                          maxLength={10}
                          disabled={isSending}
                          required
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
                        <Shield className="w-4 h-4" />
                        We'll send you a verification code
                      </p>
                    </div>

                    <AnimatedButton
                      type="submit"
                      isLoading={isSending}
                      disabled={phone.length < 10}
                      style={{ backgroundColor: '#D7882B' }}
                      onMouseEnter={(e) => !isSending && phone.length >= 10 && (e.currentTarget.style.backgroundColor = '#B87024')}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D7882B'}
                    >
                      Send OTP
                      <ArrowRight className="w-5 h-5" />
                    </AnimatedButton>
                  </form>
                </motion.div>
              )}

              {step === 'otp' && (
                <motion.div
                  key="otp"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={slideVariants}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Code sent to <span className="text-gray-900">+91 {phone}</span>
                    </p>
                  </div>

                  <form onSubmit={handleOtpSubmit}>
                    <div className="mb-6">
                      <div className="flex gap-2 justify-between mb-4">
                        {otpDigits.map((digit, index) => (
                          <OTPInput
                            key={`${resendKey}-${index}`}
                            digit={digit}
                            index={index}
                            onChange={handleOtpChange}
                            onKeyDown={handleOtpKeyDown}
                            disabled={isVerifying}
                            resendKey={resendKey}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={backToPhone}
                          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                          disabled={isVerifying}
                        >
                          Change number
                        </button>
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={secondsLeft > 0 || isVerifying || isSending}
                          className="text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ color: '#D7882B' }}
                          onMouseEnter={(e) => !(secondsLeft > 0 || isVerifying || isSending) && (e.currentTarget.style.color = '#B87024')}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#D7882B'}
                        >
                          {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Didn't receive code? Resend"}
                        </button>
                      </div>
                    </div>

                    <AnimatedButton
                      type="submit"
                      isLoading={isVerifying}
                      disabled={otp.length !== OTP_LENGTH}
                      style={{ backgroundColor: '#D7882B' }}
                      onMouseEnter={(e) => !isVerifying && otp.length === OTP_LENGTH && (e.currentTarget.style.backgroundColor = '#B87024')}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D7882B'}
                    >
                      Verify & Continue
                      <ArrowRight className="w-5 h-5" />
                    </AnimatedButton>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {step !== 'otp' && (
            <div className="px-8 pb-8">
              <div className="text-center text-sm text-gray-500">
                <p>
                  By continuing, you agree to our{' '}
                  <button className="text-slate-700 hover:text-slate-900 transition-colors">
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button className="text-slate-700 hover:text-slate-900 transition-colors">
                    Privacy Policy
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
