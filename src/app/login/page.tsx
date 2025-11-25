'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import Alert from '@/components/ui/alert';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { normalizePhone, validatePhone, formatPhoneForInput, formatPhoneForDisplay } from '@/utils/phone';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, sendOTP, verifyOTP } = useAuth();
  
  const [formData, setFormData] = useState({
    phone: '',
    otp: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectTo = searchParams.get('redirect') || '/';
      router.push(redirectTo);
    }
  }, [user, searchParams, router]);

  const handleClose = () => {
    const redirectTo = searchParams.get('redirect') || '/';
    router.push(redirectTo);
  };

  // Lock body scroll when modal is open (login page is always modal-like)
  useBodyScrollLock(true);

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [searchParams, router]);

  const handleSendOTP = async () => {
    if (!formData.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    // Normalize and validate phone number
    const normalized = normalizePhone(formData.phone);
    const validation = validatePhone(normalized);
    
    if (!validation.isValid) {
      setError(validation.error || 'Invalid phone number');
      return;
    }

    setError('');
    setOtpLoading(true);

    try {
      // Normalize phone (should be +91XXXXXXXXXX format)
      let phoneToUse = normalized;
      if (!phoneToUse.startsWith('+91')) {
        if (phoneToUse.startsWith('91') && phoneToUse.length === 12) {
          phoneToUse = '+' + phoneToUse;
        } else if (phoneToUse.length === 10) {
          phoneToUse = '+91' + phoneToUse;
        }
      }
      
      // Send OTP via MSG91 (handled by AuthContext)
      const { data, error: otpError } = await sendOTP(phoneToUse);
      
      if (otpError) {
        setError(otpError);
        setOtpLoading(false);
      } else {
        setOtpSent(true);
        setOtpLoading(false);
      }
    } catch (err: any) {
      setError('Failed to send OTP. Please try again.');
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Normalize phone (should be +91XXXXXXXXXX format)
      const normalized = normalizePhone(formData.phone);
      let phoneToUse = normalized;
      if (!phoneToUse.startsWith('+91')) {
        if (phoneToUse.startsWith('91') && phoneToUse.length === 12) {
          phoneToUse = '+' + phoneToUse;
        } else if (phoneToUse.length === 10) {
          phoneToUse = '+91' + phoneToUse;
        }
      }
      
      const { data, error: verifyError } = await verifyOTP(phoneToUse, formData.otp);
      
      if (verifyError) {
        setError(verifyError);
        setLoading(false);
      } else {
        // Redirect after successful verification
        const redirectTo = searchParams.get('redirect') || '/';
        window.location.href = redirectTo;
      }
    } catch (err: any) {
      setError('Failed to verify OTP. Please try again.');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Glass effect backdrop with blur */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-lg"
        onClick={(e) => {
          // Don't close during OTP input
          if (otpSent) {
            return;
          }
          handleClose();
        }}
      />
      
      {/* Modal container */}
      <div className="relative w-full max-w-lg z-10">
        {/* Glass effect modal */}
        <div 
          className="bg-white/90 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-2xl py-8 px-4 sm:px-10 overflow-hidden"
          style={{
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Sign in or create account
            </h2>
          </div>
          {error && (
            <div className="mb-4">
              <Alert message={error} variant="error" className="p-3" />
            </div>
          )}

          {!otpSent ? (
            <div className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">+91</span>
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => {
                        const cleaned = formatPhoneForInput(e.target.value);
                        setFormData(prev => ({ ...prev, phone: cleaned }));
                        setError(''); // Clear error on input
                      }}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300/50 bg-white/50 backdrop-blur-sm rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="9876543210"
                      maxLength={10}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your mobile number
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendOTP}
                disabled={otpLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {otpLoading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOTP}>
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">
                    OTP sent to <span className="font-medium text-gray-900">{formatPhoneForDisplay(formData.phone)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setFormData(prev => ({ ...prev, otp: '' }));
                      setError('');
                    }}
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
                    id="otp"
                    name="otp"
                    type="text"
                    maxLength={6}
                    required
                    value={formData.otp}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300/50 bg-white/50 backdrop-blur-sm rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-lg tracking-widest"
                    placeholder="000000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <Spinner className="size-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
