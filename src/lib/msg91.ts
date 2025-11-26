declare global {
  interface Window {
    initSendOTP?: (config: {
      widgetId: string;
      tokenAuth: string;
      exposeMethods?: boolean;
      success?: (data: any) => void;
      failure?: (error: any) => void;
    }) => void;
    sendOtp?: (
      identifier: string,
      success?: (data: any) => void,
      failure?: (error: any) => void
    ) => void;
    verifyOtp?: (
      otp: string,
      success?: (data: { 'access-token'?: string; accessToken?: string; phone?: string }) => void,
      failure?: (error: any) => void,
      reqId?: string
    ) => void;
    retryOtp?: (
      channel: string | null,
      success?: (data: any) => void,
      failure?: (error: any) => void,
      reqId?: string
    ) => void;
  }
}

export const MSG91_WIDGET_ID = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || '356b7a705459313031333131';
export const MSG91_TOKEN_AUTH = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || process.env.NEXT_PUBLIC_MSG91_AUTH_KEY || '479872TYchq2R469272f1eP1';

let scriptLoading = false;
let scriptLoaded = false;
let widgetInitialized = false;
let initPromise: Promise<void> | null = null;

// Note: Console filter is set up in ClientLayout.tsx to ensure it's active early

/**
 * Load MSG91 script if not already loaded
 */
export const loadMSG91Script = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is undefined'));
      return;
    }

    // If methods are already available, resolve immediately
    if (window.sendOtp && window.verifyOtp) {
      resolve();
      return;
    }

    // If script is already loading, wait for it
    if (scriptLoading && initPromise) {
      initPromise.then(resolve).catch(reject);
      return;
    }

    // If script tag exists but methods not available, wait for initialization
    if (scriptLoaded && !widgetInitialized) {
      if (initPromise) {
        initPromise.then(resolve).catch(reject);
        return;
      }
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="otp-provider.js"]');
    if (existingScript) {
      scriptLoaded = true;
      // Wait for initSendOTP to be available
      let attempts = 0;
      const maxAttempts = 50;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.initSendOTP) {
          clearInterval(checkInterval);
          initializeWidget().then(resolve).catch(reject);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('MSG91 script failed to initialize'));
        }
      }, 100);
      return;
    }

    // Load script
    // Note: MSG91's widget script (otp-provider.js) may log tokens to console internally.
    // This is from MSG91's code, not ours. We don't log tokens in our code.
    scriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://verify.msg91.com/otp-provider.js';
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      initializeWidget().then(resolve).catch(reject);
    };
    script.onerror = () => {
      scriptLoading = false;
      reject(new Error('MSG91 script load failed'));
    };
    document.body.appendChild(script);
  });
};

/**
 * Wait for MSG91 methods to be available
 */
async function waitForMethods(maxRetries = 10): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    if (window.sendOtp && window.verifyOtp && typeof window.sendOtp === 'function' && typeof window.verifyOtp === 'function') {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('MSG91 widget methods are not available. Please refresh the page and try again.');
}

/**
 * Initialize MSG91 widget with exposeMethods enabled
 */
function initializeWidget(): Promise<void> {
  if (widgetInitialized && window.sendOtp && window.verifyOtp) {
    return Promise.resolve();
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve, reject) => {
    if (!window.initSendOTP) {
      reject(new Error('initSendOTP is not available'));
      return;
    }

    window.initSendOTP({
      widgetId: MSG91_WIDGET_ID,
      tokenAuth: MSG91_TOKEN_AUTH,
      exposeMethods: true,
      success: async () => {
        try {
          await waitForMethods(20);
          widgetInitialized = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      failure: (error: any) => {
        const errorMessage = error?.message || error?.toString() || '';
        const errorCode = error?.code || '';
        
        if (errorCode === '408' || errorMessage.includes('IPBlocked') || errorMessage.includes('IP blocked')) {
          const ipBlockedError = new Error('MSG91 widget is blocked on localhost. Please deploy to a production environment or use a different IP address.');
          (ipBlockedError as any).code = '408';
          (ipBlockedError as any).isIPBlocked = true;
          reject(ipBlockedError);
        } else {
          reject(error);
        }
      },
    });
  });

  return initPromise;
}

/**
 * Ensure MSG91 methods are available
 */
export async function ensureMSG91Ready(): Promise<void> {
  await loadMSG91Script();
  await waitForMethods();
}
