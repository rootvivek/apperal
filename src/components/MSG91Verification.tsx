'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface MSG91Config {
  widgetId: string;
  tokenAuth: string;
  identifier?: string;
  exposeMethods?: boolean;
  success: (data: any) => void;
  failure: (error: any) => void;
}

declare global {
  interface Window {
    initSendOTP: (config: any) => void;
  }
}

export const MSG91Verification = ({
  phone,
  onSuccess,
  onFailure,
  onVerified
}: {
  phone: string;
  onSuccess?: (data: any) => void;
  onFailure?: (error: any) => void;
  onVerified?: (data: any) => void;
}) => {
  const { verifyOTP } = useAuth();
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH) {
      console.error('MSG91 token auth is not configured');
      onFailure?.({ error: 'MSG91 not configured' });
      return;
    }

    // Load MSG91 script
    const script = document.createElement('script');
    script.src = 'https://verify.msg91.com/otp-provider.js';
    script.async = true;

    script.onload = () => {
      // Initialize MSG91 widget
      const configuration = {
        widgetId: '356b6a663761313433363531',
        tokenAuth: process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH,
        identifier: phone,
        exposeMethods: false,
        success: async (data: any) => {
          console.log('MSG91 verification success:', data);
          onSuccess?.(data);

          try {
            // Verify the token with our backend
            const response = await fetch('/api/msg91/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                accessToken: data.token,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Verification failed');
            }

            const verificationData = await response.json();

            // If verification was successful, login with our auth system
            if (verificationData.success) {
              const authResponse = await verifyOTP(phone, data.token);
              if (authResponse.error) {
                throw new Error(authResponse.error);
              }
              onVerified?.(authResponse.data);
            }
          } catch (error) {
            console.error('Verification error:', error);
            onFailure?.(error);
          }
        },
        failure: (error: any) => {
          console.error('MSG91 verification failed:', error);
          onFailure?.(error);
        },
      };

      window.initSendOTP(configuration);
    };

    script.onerror = () => {
      console.error('Failed to load MSG91 script');
      onFailure?.({ error: 'Failed to load verification script' });
    };

    // Add script to document
    document.body.appendChild(script);

    // Cleanup
    return () => {
      document.body.removeChild(script);
    };
  }, [phone, onSuccess, onFailure, onVerified, verifyOTP]);

  return <div id="msg91-widget-container"></div>;
};

export default MSG91Verification;