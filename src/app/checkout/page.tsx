'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface CheckoutFormData {
  email?: string;
  fullName: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  paymentMethod: 'cod' | 'razorpay';
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardName: string;
  billingSameAsShipping: boolean;
}

function CheckoutContent() {
  const { user } = useAuth();
  const { cartItems, loading: cartLoading, clearCart } = useCart();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [directPurchaseItems, setDirectPurchaseItems] = useState<any[]>([]);
  const [isDirectPurchase, setIsDirectPurchase] = useState(false);
  const [loadingDirectProduct, setLoadingDirectProduct] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData>({
    email: '',
    fullName: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    paymentMethod: 'razorpay',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
    billingSameAsShipping: true
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [showPaymentFailedModal, setShowPaymentFailedModal] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');

  // Handle direct purchase from URL parameters
  useEffect(() => {
    const direct = searchParams.get('direct');
    const productId = searchParams.get('productId');
    const quantity = searchParams.get('quantity');
    const size = searchParams.get('size');
    
    if (direct === 'true' && productId && quantity) {
      setIsDirectPurchase(true);
      setLoadingDirectProduct(true);
      
      // Fetch product details directly from database
      const fetchDirectProduct = async () => {
        try {
          const { data: product, error } = await supabase
            .from('products')
            .select('id, name, price, image_url, stock_quantity')
            .eq('id', productId)
            .eq('is_active', true)
            .single();
          
          if (error || !product) {
            console.error('Error fetching product for direct purchase:', error);
            alert('Product not found. Redirecting to home page.');
            window.location.href = '/';
            return;
          }
          
          // Create cart item format for direct purchase
          setDirectPurchaseItems([{
            product: {
              id: product.id,
              name: product.name,
              price: product.price,
              image_url: product.image_url,
              stock_quantity: product.stock_quantity
            },
            quantity: parseInt(quantity),
            size: size || null
          }]);
        } catch (error) {
          console.error('Error in fetchDirectProduct:', error);
          alert('Error loading product. Redirecting to home page.');
          window.location.href = '/';
        } finally {
          setLoadingDirectProduct(false);
        }
      };
      
      fetchDirectProduct();
    }
  }, [searchParams, supabase]);

  // Update form data when user is available
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [user]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      setRazorpayLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  const getSubtotal = () => {
    const items = isDirectPurchase ? directPurchaseItems : cartItems;
    return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const getShipping = () => {
    const subtotal = getSubtotal();
    return subtotal >= 50 ? 0 : 0.00;
  };

  const getTotal = () => {
    return getSubtotal() + getShipping();
  };

  // Redirect if cart is empty
  if (cartLoading || loadingDirectProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && !isDirectPurchase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-6">Add some items to your cart before checkout</p>
          <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const validateForm = (): { isValid: boolean; errors: {[key: string]: string} } => {
    const newErrors: {[key: string]: string} = {};
    
    // Validate name (fullName)
    if (!formData.fullName || formData.fullName.trim() === '') {
      newErrors.fullName = 'Name is required';
    }
    
    // Validate phone number - must be exactly 10 digits
    if (!formData.phone || formData.phone.trim() === '') {
      newErrors.phone = 'Phone number is required';
    } else {
      // Remove all non-digit characters for validation
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        newErrors.phone = 'Phone number must be exactly 10 digits';
      }
    }
    
    // Validate address
    if (!formData.address || formData.address.trim() === '') {
      newErrors.address = 'Address is required';
    }
    
    // Validate city
    if (!formData.city || formData.city.trim() === '') {
      newErrors.city = 'City is required';
    }
    
    // Validate state
    if (!formData.state || formData.state.trim() === '') {
      newErrors.state = 'State is required';
    }
    
    // Validate zip code - must be exactly 6 digits
    if (!formData.zipCode || formData.zipCode.trim() === '') {
      newErrors.zipCode = 'Zip code is required';
    } else {
      // Remove all non-digit characters for validation
      const zipDigits = formData.zipCode.replace(/\D/g, '');
      if (zipDigits.length !== 6) {
        newErrors.zipCode = 'Zip code must be exactly 6 digits';
      }
    }
    
    setErrors(newErrors);
    
    // Return validation result
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    const validation = validateForm();
    if (!validation.isValid) {
      // Scroll to first error after a short delay to ensure state is updated
      setTimeout(() => {
        const firstErrorField = Object.keys(validation.errors)[0];
        if (firstErrorField) {
          const element = document.querySelector(`[name="${firstErrorField}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const items = isDirectPurchase ? directPurchaseItems : cartItems;
      const subtotal = getSubtotal();
      const shipping = getShipping();
      const total = getTotal();
      
      // Generate unique short order number (4-6 digits) with ORD-ID: prefix
      const generateShortOrderNumber = async (): Promise<string> => {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          // Generate a random number between 1000 and 999999 (4-6 digits)
          const min = 1000;
          const max = 999999;
          const orderNum = Math.floor(Math.random() * (max - min + 1)) + min;
          const orderNumber = `ORD-ID:${orderNum.toString()}`;
          
          // Check if this order number already exists
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('order_number', orderNumber)
            .maybeSingle();
          
          if (!existingOrder) {
            return orderNumber;
          }
          
          attempts++;
        }
        
        // Fallback: use timestamp-based number if all attempts fail
        const fallbackNum = Date.now().toString().slice(-6);
        return `ORD-ID:${fallbackNum}`;
      };
      
      const orderNumber = await generateShortOrderNumber();
      
      // Create order using the correct column names for your database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null,
          order_number: orderNumber,
          payment_method: formData.paymentMethod,
          total_amount: total,
          status: 'pending',
          // Store customer information for guest orders
          customer_name: formData.fullName || null,
          customer_phone: formData.phone || null,
          customer_email: formData.email || null,
          shipping_address: formData.address || null,
          shipping_city: formData.city || null,
          shipping_state: formData.state || null,
          shipping_zip_code: formData.zipCode || null
        })
        .select('id');
      
      // Check for error first  
      if (orderError) {
        console.error('Error creating order:', orderError);
        alert('Failed to place order. Please try again.');
        setIsProcessing(false);
        return;
      }
      
      // Supabase insert returns an array, get the first element
      const createdOrder = Array.isArray(order) ? order[0] : order;
      
      if (!createdOrder || !createdOrder.id) {
        alert('Failed to create order. Please try again.');
        setIsProcessing(false);
        return;
      }
      
      // Create order items with required fields matching the schema
      // For direct purchase, use the size from directPurchaseItems
      // For cart items, use the size from cart items
      const orderItems = items.map((item) => {
        let sizeValue = null;
        
        // If it's a direct purchase, use the size from the item
        if (isDirectPurchase && (item as any).size) {
          sizeValue = (item as any).size;
        } else if (!isDirectPurchase && (item as any).size) {
          // For cart items, use the size from the cart item
          sizeValue = (item as any).size;
        }
        
        return {
          order_id: createdOrder.id,
          product_id: item.product.id,
          product_name: item.product.name,
          product_price: item.product.price,
          total_price: item.product.price * item.quantity,
          quantity: item.quantity,
          size: sizeValue
        };
      });
      
      const insertResult = await supabase
        .from('order_items')
        .insert(orderItems) as any;
      
      console.log('Order items to insert:', orderItems);
      console.log('Insert result:', insertResult);
      
      if (insertResult && insertResult.error) {
        console.error('Error creating order items:', insertResult.error);
        console.error('Order items data:', orderItems);
        alert(`Failed to create order items. Error: ${insertResult.error.message}. Please contact support.`);
        setIsProcessing(false);
        return;
      }
      
      console.log('Order items created successfully!');
      
      // Handle payment based on payment method
      if (formData.paymentMethod === 'razorpay') {
        // Initiate Razorpay payment
        await handleRazorpayPayment(createdOrder.id, orderNumber);
        return; // Don't clear cart or redirect yet - wait for payment completion
      }
      
      // For COD and card (manual), proceed with normal flow
      // Clear cart only if items were purchased from cart (not direct purchase)
      // For direct purchases, don't clear cart since those items weren't in cart
      if (!isDirectPurchase) {
        await clearCart();
      }
      
      // Redirect to success page
      window.location.href = `/checkout/success?orderId=${createdOrder.id}&orderNumber=${orderNumber}`;
      
    } catch (error) {
      console.error('Error placing order:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePaymentMethodChange = (method: 'cod' | 'razorpay') => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: method
    }));
  };

  const handleRazorpayPayment = async (orderId: string, orderNumber: string) => {
    // Check if Razorpay script is loaded
    if (!razorpayLoaded) {
      console.log('Razorpay script not loaded yet, waiting...');
      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!(window as any).Razorpay) {
        alert('Payment gateway is loading. Please wait a moment and try again.');
        setIsProcessing(false);
        return;
      }
    }

    // Double check Razorpay is available
    if (!(window as any).Razorpay) {
      console.error('Razorpay object not found on window');
      alert('Payment gateway failed to load. Please refresh the page and try again.');
      setIsProcessing(false);
      return;
    }

    try {
      const total = getTotal();
      console.log('Creating Razorpay order for amount:', total, 'Order ID:', orderId);
      
      // Create Razorpay order
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          amount: total,
          currency: 'INR',
          orderId: orderId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Razorpay order creation failed:', error);
        throw new Error(error.error || 'Failed to create payment order');
      }

      const razorpayOrder = await response.json();
      console.log('Razorpay order created:', razorpayOrder);

      // Check if key is available
      if (!razorpayOrder.key) {
        console.error('Razorpay key not found in response');
        throw new Error('Payment gateway configuration error. Please contact support.');
      }

      // Initialize Razorpay checkout
      const options = {
        key: razorpayOrder.key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Apperal',
        description: `Order ${orderNumber}`,
        order_id: razorpayOrder.id,
        handler: async function (response: any) {
          try {
            console.log('Payment successful, verifying...', response);
            // Verify payment on server
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include', // Include cookies for authentication
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: orderId,
              }),
            });

            if (!verifyResponse.ok) {
              const error = await verifyResponse.json();
              throw new Error(error.error || 'Payment verification failed');
            }

            // Clear cart
            if (!isDirectPurchase) {
              await clearCart();
            }

            // Redirect to success page
            window.location.href = `/checkout/success?orderId=${orderId}&orderNumber=${orderNumber}`;
          } catch (error: any) {
            console.error('Payment verification error:', error);
            setPaymentError(error.message || 'Payment verification failed. Please contact support.');
            setShowPaymentFailedModal(true);
            setIsProcessing(false);
          }
        },
        prefill: {
          name: formData.fullName,
          email: formData.email || user?.email || '',
          contact: formData.phone,
        },
        theme: {
          color: '#4736FE',
        },
        modal: {
          ondismiss: function() {
            console.log('Razorpay modal dismissed');
            setIsProcessing(false);
          },
        },
      };

      // Add error handler for Razorpay payment failures
      (options as any).onError = function(error: any) {
        console.error('Razorpay payment error:', error);
        setPaymentError(error.error?.description || error.error?.reason || 'Payment failed. Please try again.');
        setShowPaymentFailedModal(true);
        setIsProcessing(false);
      };

      console.log('Opening Razorpay checkout...');
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Razorpay payment error:', error);
      setPaymentError(error.message || 'Payment failed. Please try again.');
      setShowPaymentFailedModal(true);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-2 sm:px-4 md:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
                <div className="mb-4">
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.fullName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., John Doe"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Street address"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 mb-1">
                    Apartment, suite, etc. (optional)
                  </label>
                  <input
                    type="text"
                    id="apartment"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="state"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select state</option>
                      <option value="AP">Andhra Pradesh</option>
                      <option value="AS">Assam</option>
                      <option value="BR">Bihar</option>
                      <option value="CG">Chhattisgarh</option>
                      <option value="GA">Goa</option>
                      <option value="GJ">Gujarat</option>
                      <option value="HR">Haryana</option>
                      <option value="HP">Himachal Pradesh</option>
                      <option value="JH">Jharkhand</option>
                      <option value="KA">Karnataka</option>
                      <option value="KL">Kerala</option>
                      <option value="MP">Madhya Pradesh</option>
                      <option value="MH">Maharashtra</option>
                      <option value="MN">Manipur</option>
                      <option value="ML">Meghalaya</option>
                      <option value="MZ">Mizoram</option>
                      <option value="NL">Nagaland</option>
                      <option value="OD">Odisha</option>
                      <option value="PB">Punjab</option>
                      <option value="RJ">Rajasthan</option>
                      <option value="SK">Sikkim</option>
                      <option value="TN">Tamil Nadu</option>
                      <option value="TS">Telangana</option>
                      <option value="TR">Tripura</option>
                      <option value="UP">Uttar Pradesh</option>
                      <option value="UK">Uttarakhand</option>
                      <option value="WB">West Bengal</option>
                      <option value="DL">Delhi (NCT)</option>
                    </select>
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your city"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      required
                    value={formData.zipCode}
                    onChange={handleChange}
                    maxLength={6}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.zipCode ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="123456"
                    />
                    {errors.zipCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    maxLength={10}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="1234567890"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
                
                <div className="space-y-3 mb-6">
                  <label className="flex items-center p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={formData.paymentMethod === 'razorpay'}
                      onChange={() => handlePaymentMethodChange('razorpay')}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Razorpay</div>
                      <div className="text-sm text-gray-500">Pay securely with UPI, Cards, Wallets & more</div>
                    </div>
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </label>
                  
                  <label className="flex items-center p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={() => handlePaymentMethodChange('cod')}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Cash on Delivery</div>
                      <div className="text-sm text-gray-500">Pay cash when your order arrives</div>
                    </div>
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className={`w-full py-3 px-6 rounded-md font-medium transition-colors ${
                  isProcessing
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isProcessing 
                  ? 'Processing...' 
                  : formData.paymentMethod === 'cod' 
                    ? 'Place Order (Cash on Delivery)' 
                    : 'Pay with Razorpay'
                }
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              {/* Real cart items */}
              <div className="space-y-4 mb-6">
                {cartItems.length === 0 && directPurchaseItems.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Your cart is empty</p>
                    <Link href="/" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
                      Continue Shopping
                    </Link>
                  </div>
                ) : (
                  (isDirectPurchase ? directPurchaseItems : cartItems).map((item, index) => (
                    <div key={item.id || `item-${index}`} className="flex items-center space-x-3">
                      <img
                        src={item.product.image_url || '/placeholder-product.jpg'}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover rounded-md"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-product.jpg';
                        }}
                      />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{item.product.name}</h3>
                        <p className="text-xs text-gray-600">
                          Qty: {item.quantity}
                          <span className="ml-2">| Size: {item.size || 'Select Size'}</span>
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        ₹{(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{getSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {getShipping() === 0 ? 'Free' : `₹${getShipping().toFixed(2)}`}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">₹0.00</span>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>₹{getTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Security Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    SSL Encrypted
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Secure Payment
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Failed Modal */}
      {showPaymentFailedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Payment Failed
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {paymentError || 'Your payment could not be processed. Please try again.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentFailedModal(false);
                  setPaymentError('');
                  setIsProcessing(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowPaymentFailedModal(false);
                  setPaymentError('');
                  setIsProcessing(false);
                  // Scroll to payment section
                  const paymentSection = document.querySelector('[name="paymentMethod"]');
                  if (paymentSection) {
                    paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className="flex-1 px-4 py-2 bg-[#4736FE] text-white rounded-md hover:bg-[#3a2dd4] transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <AuthGuard>
      <CheckoutContent />
    </AuthGuard>
  );
}
