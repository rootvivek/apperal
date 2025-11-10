'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Script from 'next/script';

declare global {
  interface Window {
    initSendOTP: (config: any) => void;
    sendOTP: () => void;
    verifyOTP: (otp: string) => void;
  }
}

export default function SMSVerificationTest() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const { sendOTP: authSendOTP, verifyOTP: authVerifyOTP } = useAuth();

  const verifyTokenWithServer = async (accessToken: string) => {
    try {
      const response = await fetch('/api/msg91/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Token verification failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (isScriptLoaded) {
      const configuration = {
        widgetId: "356b6a663761313433363531",
        tokenAuth: "477219T76HjcGeGew69118f03P1",
        identifier: phoneNumber || undefined,
        exposeMethods: true,
        success: async (data: any) => {
          console.log('MSG91 success response:', data);
          setStatus('OTP verified successfully! Verifying token with server...');
          
          try {
            // Verify the token with our server
            const verificationResult = await verifyTokenWithServer(data.token);
            setStatus('Verification complete: ' + JSON.stringify(verificationResult));
            console.log('Server verification result:', verificationResult);
          } catch (error) {
            setError('Server verification failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
            console.error('Server verification error:', error);
          }
        },
        failure: (error: any) => {
          setError('MSG91 verification failed: ' + JSON.stringify(error));
          console.log('MSG91 failure reason:', error);
          setStatus('');
        },
        VAR1: undefined
      };

      window.initSendOTP(configuration);
    }
  }, [isScriptLoaded, phoneNumber]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending OTP...');
    setError('');

    try {
      // Try MSG91 first
      if (window.sendOTP) {
        window.sendOTP();
      } else {
        // Fallback to Firebase
        const result = await authSendOTP(phoneNumber);
        if (result.error) {
          setError(result.error);
          setStatus('');
        } else {
          setStatus('OTP sent successfully! Check your phone.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setStatus('');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Verifying OTP...');
    setError('');

    try {
      // Try MSG91 first
      if (window.verifyOTP) {
        window.verifyOTP(otp);
      } else {
        // Fallback to Firebase
        const result = await authVerifyOTP(phoneNumber, otp);
        if (result.error) {
          setError(result.error);
          setStatus('');
        } else {
          setStatus('OTP verified successfully! User authenticated.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setStatus('');
    }
  };

  return (
    <>
      <Script
        src="https://verify.msg91.com/otp-provider.js"
        onLoad={() => setIsScriptLoaded(true)}
      />
      
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-8">SMS OTP Verification Test</h1>
          
          {/* Test Instructions */}
          <div className="mb-8 p-4 bg-blue-50 rounded-md">
            <h2 className="font-semibold text-blue-800 mb-2">MSG91 Test Environment:</h2>
            <ul className="text-sm text-blue-700 list-disc list-inside">
              <li>Widget ID: 356b6a663761313433363531</li>
              <li>Auth Token: 477219T76HjcGeGew69118f03P1</li>
              <li>Server-side verification enabled</li>
              <li>Enter a valid phone number to test</li>
              <li className="text-xs mt-1 text-blue-600">Format: Country code + Number (e.g., +911234567890)</li>
            </ul>
            <p className="text-xs mt-2 text-blue-500">
              Note: The system will verify the OTP token with MSG91 servers after successful client-side verification
            </p>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Firebase Fallback:</h3>
              <ul className="text-sm text-blue-700 list-disc list-inside">
                <li>+1 650-555-1234 (US)</li>
                <li>+44 7700-900000 (UK)</li>
                <li>Test code: 123456</li>
              </ul>
            </div>
          </div>

        {/* Send OTP Form */}
        <form onSubmit={handleSendOTP} className="mb-8">
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Send OTP
          </button>
        </form>

        {/* Verify OTP Form */}
        <form onSubmit={handleVerifyOTP}>
          <div className="mb-4">
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Verify OTP
          </button>
        </form>

        {/* Status and Error Display */}
        {status && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700">{status}</p>
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}