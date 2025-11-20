import { useState, useEffect } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function useRazorpay() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadScript = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (window.Razorpay) {
      setLoaded(true);
      return true;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      // Wait for existing script to load
      for (let i = 0; i < 10 && !window.Razorpay; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (window.Razorpay) {
        setLoaded(true);
        return true;
      }
    }

    setLoading(true);
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        setLoaded(true);
        setLoading(false);
        resolve(true);
      };
      script.onerror = () => {
        setLoading(false);
        resolve(false);
      };
      document.head.appendChild(script);
    });
  };

  const ensureLoaded = async (): Promise<boolean> => {
    if (window.Razorpay) return true;
    
    for (let i = 0; i < 10 && !window.Razorpay; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!window.Razorpay) {
      return await loadScript();
    }
    return true;
  };

  return { loaded, loading, loadScript, ensureLoaded };
}

