'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, sendOTP, verifyOTP, signInWithEmail, signInWithGoogle, signInWithFacebook } = useAuth();
  
  // Prevent navigation to login page if already on login page
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/login') {
      return;
    }
  }, []);

  const [authMethod, setAuthMethod] = useState<'otp' | 'email'>('otp');
  const [formData, setFormData] = useState({
    phone: '+91',
    otp: '',
    email: '',
    password: '',
    rememberMe: false
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

  const handleSendOTP = async () => {
    console.log('Phone number being validated:', formData.phone);
    console.log('Phone number length:', formData.phone.length);
    console.log('Phone number trimmed:', formData.phone.trim());
    console.log('Regex test result:', /^\+[1-9]\d{1,14}$/.test(formData.phone.trim()));
    
    if (!formData.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    // Validate phone number format
    if (!/^\+[1-9]\d{1,14}$/.test(formData.phone.trim())) {
      // More detailed error message
      const phone = formData.phone.trim();
      if (!phone.startsWith('+')) {
        setError('Phone number must start with + (e.g., +1234567890)');
      } else if (phone.length < 8) {
        setError('Phone number too short (minimum 8 digits including country code)');
      } else if (phone.length > 16) {
        setError('Phone number too long (maximum 15 digits including country code)');
      } else if (!/^\+[1-9]\d+$/.test(phone)) {
        setError('Phone number contains invalid characters (only digits allowed after +)');
      } else {
        setError('Please enter a valid phone number with country code (e.g., +1234567890)');
      }
      return;
    }

    setError('');
    setOtpLoading(true);

    try {
      const { data, error: otpError } = await sendOTP(formData.phone);
      
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
      const { data, error: verifyError } = await verifyOTP(formData.phone, formData.otp);
      
      if (verifyError) {
        setError(verifyError);
        setLoading(false);
      } else {
        // Redirect to the intended page or home
        const redirectTo = searchParams.get('redirect') || '/';
        router.push(redirectTo);
      }
    } catch (err: any) {
      setError('Failed to verify OTP. Please try again.');
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await signInWithEmail(formData.email, formData.password);
      
      if (signInError) {
        setError(signInError);
        setLoading(false);
      } else {
        // Redirect to the intended page or home
        const redirectTo = searchParams.get('redirect') || '/';
        router.push(redirectTo);
      }
    } catch (err: any) {
      setError('Failed to sign in. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    await signInWithGoogle();
    // Redirect will be handled by auth state change
  };

  const handleFacebookSignIn = async () => {
    setError('');
    await signInWithFacebook();
    // Redirect will be handled by auth state change
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 overflow-hidden">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {/* Auth Method Toggle */}
          <div className="mb-6">
            <div className="flex rounded-lg border border-gray-300 p-1 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('email');
                  setError('');
                  setOtpSent(false);
                }}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  authMethod === 'email'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('otp');
                  setError('');
                  setOtpSent(false);
                }}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  authMethod === 'otp'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Phone (OTP)
              </button>
            </div>
          </div>

          <form className="space-y-6" onSubmit={authMethod === 'email' ? handleEmailSignIn : (otpSent ? handleVerifyOTP : undefined)}>
            {authMethod === 'email' ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                      Remember me
                    </label>
                  </div>
                  <div className="text-sm">
                    <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </>
            ) : !otpSent ? (
              <>
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
                        autoComplete="tel"
                        required
                        value={formData.phone.replace('+91', '')}
                        onChange={(e) => {
                          const value = '+91' + e.target.value;
                          setFormData(prev => ({ ...prev, phone: value }));
                        }}
                        className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Type phone number"
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
              </>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600">
                      OTP sent to <span className="font-medium text-gray-900">{formData.phone}</span>
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
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-lg tracking-widest"
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
              </>
            )}
          </form>

          {authMethod === 'email' && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button 
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="ml-2 font-medium">Continue with Google</span>
              </button>

              <button 
                type="button"
                onClick={handleFacebookSignIn}
                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-[#1877F2] rounded-md shadow-sm bg-[#1877F2] text-sm font-medium text-white hover:bg-[#0C63D4] hover:border-[#0C63D4] transition-colors">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="ml-2 font-medium">Continue with Facebook</span>
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
