import { CheckoutFormData } from '@/lib/schemas/checkout';

interface RazorpayPaymentParams {
  orderNumber: string;
  orderItemsData: any[];
  formData: CheckoutFormData;
  shippingAddressId: string | null;
  total: number;
  subtotal: number;
  shipping: number;
  userId: string;
  isDirectPurchase: boolean;
  onError: (error: string) => void;
  onSuccess: (orderId: string) => void;
  clearCart: () => Promise<void>;
}

/**
 * Dynamically loads Razorpay script and handles payment
 * This function is only imported when payment button is clicked
 */
export async function handleRazorpayPayment({
  orderNumber,
  orderItemsData,
  formData,
  shippingAddressId,
  total,
  subtotal,
  shipping,
  userId,
  isDirectPurchase,
  onError,
  onSuccess,
  clearCart,
}: RazorpayPaymentParams): Promise<void> {
  // Dynamically load Razorpay script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }

      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        // Wait for existing script to load
        let attempts = 0;
        const checkInterval = setInterval(() => {
          if ((window as any).Razorpay) {
            clearInterval(checkInterval);
            resolve(true);
          } else if (attempts++ > 10) {
            clearInterval(checkInterval);
            resolve(false);
          }
        }, 500);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const razorpayLoaded = await loadRazorpayScript();
  if (!razorpayLoaded) {
    throw new Error('Payment gateway failed to load. Please refresh the page and try again.');
  }

  try {
    const response = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: total,
        currency: 'INR',
        userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment order');
    }

    const razorpayOrder = await response.json();

    if (!razorpayOrder.key) {
      throw new Error('Payment gateway configuration error. Please contact support.');
    }

    const options = {
      key: razorpayOrder.key,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: 'Nipto',
      description: `Order ${orderNumber}`,
      order_id: razorpayOrder.id,
      handler: async function (response: any) {
        try {
          const verifyResponse = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderNumber,
              orderItems: orderItemsData,
              orderData: {
                subtotal,
                shipping,
                total,
                formData,
                shippingAddressId,
              },
              userId,
            }),
          });

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Payment verification failed');
          }

          const result = await verifyResponse.json();
          if (!result.order?.id) {
            throw new Error('Order creation failed after payment. Please contact support.');
          }

          if (!isDirectPurchase) {
            await clearCart();
          }

          onSuccess(result.order.id);
          window.location.href = `/checkout/success?orderId=${result.order.id}&orderNumber=${orderNumber}`;
        } catch (error: any) {
          onError(error.message || 'Payment verification failed. Please contact support.');
        }
      },
      prefill: {
        name: formData.fullName,
        contact: formData.phone,
      },
      theme: { color: '#4736FE' },
      modal: {
        ondismiss: () => {
          // Payment modal dismissed
        },
      },
      onError: (error: any) => {
        onError(error.error?.description || error.error?.reason || 'Payment failed. Please try again.');
      },
    };

    const Razorpay = (window as any).Razorpay;
    const razorpay = new Razorpay(options);
    razorpay.open();
  } catch (error: any) {
    onError(error.message || 'Payment failed. Please try again.');
    throw error;
  }
}

