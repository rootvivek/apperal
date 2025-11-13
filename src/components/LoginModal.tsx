'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string; // Kept for compatibility but not used for redirects
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { user, sendOTP, verifyOTP } = useAuth();
  
  const [formData, setFormData] = useState({
    phone: '+91',
    otp: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Close modal if user logs in (stay on same page)
  useEffect(() => {
    if (user && isOpen) {
      onClose();
      // Stay on the same page - no redirect needed
    }
  }, [user, isOpen, onClose]);

  // Close modal on ESC key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSendOTP = async () => {
    if (!formData.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    // Validate phone number format
    if (!/^\+[1-9]\d{1,14}$/.test(formData.phone.trim())) {
      const phone = formData.phone.trim();
      if (!phone.startsWith('+')) {
        setError('Phone number must start with + (e.g., +1234567890)');
      } else if (phone.length < 8) {
        setError('Phone number too short (minimum 8 digits including country code)');
      } else if (phone.length > 16) {
        setError('Phone number too long (maximum 15 digits including country code)');
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
        // Close modal and stay on the same page
        onClose();
        // User will stay on the current page automatically
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

  const handleClose = () => {
    setError('');
    setOtpSent(false);
    setFormData({ phone: '+91', otp: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Glass effect backdrop with blur */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-lg"
        onClick={handleClose}
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
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
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
            <div className="mb-4 p-3 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
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
                      autoComplete="tel"
                      required
                      value={formData.phone.replace('+91', '')}
                      onChange={(e) => {
                        const value = '+91' + e.target.value;
                        setFormData(prev => ({ ...prev, phone: value }));
                      }}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300/50 bg-white/50 backdrop-blur-sm rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOTP}>
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

