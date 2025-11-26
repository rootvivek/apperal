'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginOTP } from '@/hooks/useLoginOTP';
import { Spinner } from '@/components/ui/spinner';
import Alert from '@/components/ui/alert';
import { formatPhoneForInput, formatPhoneForDisplay } from '@/utils/phone';

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loginWithToken } = useAuth();
  const {
    step,
    phone,
    otp,
    error: otpError,
    isSending,
    isVerifying,
    setPhone,
    setOtp,
    sendOtp,
    verifyOtp,
    resetState,
  } = useLoginOTP();
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectTo = searchParams.get('redirect') || '/';
      router.push(redirectTo);
    }
  }, [user, searchParams, router]);

  // Handle successful login
  useEffect(() => {
    if (user && step === 'otp') {
      resetState();
      const redirectTo = searchParams.get('redirect') || '/';
      router.push(redirectTo);
    }
  }, [user, step, searchParams, router, resetState]);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      return;
    }
    await sendOtp(phone);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) {
      return;
    }

    try {
      const result = await verifyOtp(otp);
      const accessToken = result['access-token'] || result.accessToken;
      if (accessToken) {
        await loginWithToken(accessToken, result.phone || phone);
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 overflow-hidden">
          {otpError && (
            <div className="mb-4">
              <Alert message={otpError} variant="error" className="p-3" />
            </div>
          )}

          {step === 'phone' ? (
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
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneForInput(e.target.value))}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="9876543210"
                      maxLength={10}
                      disabled={isSending}
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
                disabled={isSending || phone.length < 10}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSending ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOTP}>
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">
                    OTP sent to <span className="font-medium text-gray-900">{formatPhoneForDisplay(phone)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      resetState();
                    }}
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                    disabled={isVerifying}
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
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-lg tracking-widest"
                    placeholder="0000"
                    disabled={isVerifying}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying || otp.length !== 4}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <Spinner className="size-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignUpPageContent />
    </Suspense>
  );
}
