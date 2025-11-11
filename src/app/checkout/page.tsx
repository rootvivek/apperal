'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getProductDetailType } from '@/utils/productDetailsMapping';

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
  
  // Helper function to check URL params immediately (client-side only)
  const getUrlParams = () => {
    if (typeof window === 'undefined') {
      return { direct: null, productId: null, quantity: null, size: null };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      direct: params.get('direct'),
      productId: params.get('productId'),
      quantity: params.get('quantity'),
      size: params.get('size')
    };
  };

  // Initialize direct purchase state immediately from URL (for production)
  const initialUrlParams = getUrlParams();
  const initialIsDirectPurchase = Boolean(
    initialUrlParams.direct === 'true' && 
    initialUrlParams.productId && 
    initialUrlParams.quantity
  );

  const [directPurchaseItems, setDirectPurchaseItems] = useState<any[]>([]);
  const [isDirectPurchase, setIsDirectPurchase] = useState<boolean>(initialIsDirectPurchase);
  const [loadingDirectProduct, setLoadingDirectProduct] = useState<boolean>(initialIsDirectPurchase);
  
  // Store URL params in state to ensure they're available
  const [urlParams, setUrlParams] = useState(initialUrlParams);
  
  // Initialize URL params and direct purchase state on client-side mount
  useEffect(() => {
    // Get params from URL (client-side only)
    const params = getUrlParams();
    
    setUrlParams(params);
    
    // Set direct purchase state if params are present
    if (params.direct === 'true' && params.productId && params.quantity) {
      setIsDirectPurchase(true);
      setLoadingDirectProduct(true);
    }
  }, []); // Run only once on mount
  const [productSubcategories, setProductSubcategories] = useState<{[key: string]: {name: string | null, slug: string | null, detail_type: string | null}}>({});
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
  const hasFetchedDirectProduct = useRef(false);

  // Handle direct purchase from URL parameters - fetch product when params are available
  useEffect(() => {
    // Get current URL params (may have been updated)
    const currentParams = getUrlParams();
    const productId = currentParams.productId || urlParams.productId;
    const quantity = currentParams.quantity || urlParams.quantity;
    const size = currentParams.size || urlParams.size;
    
    // Check if this is a direct purchase
    const isDirect = currentParams.direct === 'true' || urlParams.direct === 'true';
    
    // Only run if we have direct purchase params and haven't loaded items yet
    if (isDirect && productId && quantity && directPurchaseItems.length === 0 && !hasFetchedDirectProduct.current) {
      hasFetchedDirectProduct.current = true;
      setLoadingDirectProduct(true);
      setIsDirectPurchase(true);
      
      // Fetch product details directly from database
      const fetchDirectProduct = async () => {
        try {
          const { data: product, error } = await supabase
            .from('products')
            .select('id, name, price, image_url, stock_quantity, subcategory_id')
            .eq('id', productId!)
            .eq('is_active', true)
            .single();
          
          if (error || !product) {
            console.error('Error fetching product for direct purchase:', error);
            setLoadingDirectProduct(false);
            return;
          }
          
          // Fetch subcategory info if subcategory_id exists
          let subcategoryInfo = { name: null, slug: null, detail_type: null };
          if (product.subcategory_id) {
            const { data: subcategory } = await supabase
              .from('subcategories')
              .select('name, slug, detail_type')
              .eq('id', product.subcategory_id)
              .single();
            
            if (subcategory) {
              subcategoryInfo = {
                name: subcategory.name,
                slug: subcategory.slug,
                detail_type: subcategory.detail_type
              };
              setProductSubcategories(prev => ({
                ...prev,
                [product.id]: subcategoryInfo
              }));
            }
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
            quantity: parseInt(quantity!),
            size: size || null
          }]);
        } catch (error) {
          console.error('Error in fetchDirectProduct:', error);
        } finally {
          setLoadingDirectProduct(false);
        }
      };
      
      fetchDirectProduct();
    }
  }, [isDirectPurchase, initialIsDirectPurchase, urlParams.productId, urlParams.quantity, directPurchaseItems.length, supabase]);

  // Helper function to map state name to state code
  const getStateCode = (stateName: string | null | undefined): string => {
    if (!stateName) return '';
    
    const stateMap: { [key: string]: string } = {
      'Andhra Pradesh': 'AP',
      'Assam': 'AS',
      'Bihar': 'BR',
      'Chhattisgarh': 'CG',
      'Goa': 'GA',
      'Gujarat': 'GJ',
      'Haryana': 'HR',
      'Himachal Pradesh': 'HP',
      'Jharkhand': 'JH',
      'Karnataka': 'KA',
      'Kerala': 'KL',
      'Madhya Pradesh': 'MP',
      'Maharashtra': 'MH',
      'Manipur': 'MN',
      'Meghalaya': 'ML',
      'Mizoram': 'MZ',
      'Nagaland': 'NL',
      'Odisha': 'OD',
      'Punjab': 'PB',
      'Rajasthan': 'RJ',
      'Sikkim': 'SK',
      'Tamil Nadu': 'TN',
      'Telangana': 'TS',
      'Tripura': 'TR',
      'Uttar Pradesh': 'UP',
      'Uttarakhand': 'UK',
      'West Bengal': 'WB',
      'Delhi (NCT)': 'DL',
      'Delhi': 'DL',
    };

    // Check if it's already a code (2 letters)
    if (stateName.length === 2 && stateName === stateName.toUpperCase()) {
      return stateName;
    }

    // Try to find by exact match
    if (stateMap[stateName]) {
      return stateMap[stateName];
    }

    // Try case-insensitive match
    const stateNameLower = stateName.toLowerCase();
    for (const [key, value] of Object.entries(stateMap)) {
      if (key.toLowerCase() === stateNameLower) {
        return value;
      }
    }

    // If no match found, return the original value (might be a custom state)
    return stateName;
  };

  // Fetch user data function
  const fetchUserData = async () => {
    if (!user?.id) return;

    try {
      // Fetch user profile for full name and phone
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();

      // Fetch default address, or most recent address if no default
      const { data: defaultAddress } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If no default address, try to get the most recent address
      let address = defaultAddress;
      if (!address) {
        const { data: recentAddress } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        address = recentAddress;
      }

      // Map state name to state code for the dropdown
      const stateCode = getStateCode(address?.state);

      // Update form with profile data only (don't use Firebase user data or previous form data)
      // This ensures if user removes data from profile, it won't show in checkout
      setFormData(prev => ({
        ...prev,
        email: user.email || '', // Only use Firebase email (can't be removed)
        fullName: profile?.full_name || '', // Only from profile, empty if removed
        phone: profile?.phone || '', // Only from profile, empty if removed
        address: address?.address_line1 || '', // Only from address, empty if removed
        apartment: address?.address_line2 || '', // Only from address, empty if removed
        city: address?.city || '', // Only from address, empty if removed
        state: stateCode || '', // Only from address, empty if removed
        zipCode: address?.zip_code || '' // Only from address, empty if removed
      }));
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Update form data when user is available and fetch default address
  useEffect(() => {
    fetchUserData();
  }, [user?.id]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      // Re-fetch user data when profile is updated
      fetchUserData();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.id]);

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

  // Fetch subcategory info for cart items
  useEffect(() => {
    const fetchSubcategoryInfo = async () => {
      if (cartItems.length === 0) return;
      
      const subcategoryMap: {[key: string]: {name: string | null, slug: string | null, detail_type: string | null}} = {};
      
      for (const item of cartItems) {
        try {
          const { data: product } = await supabase
            .from('products')
            .select('subcategory_id')
            .eq('id', item.product_id)
            .single();
          
          if (product?.subcategory_id) {
            const { data: subcategory } = await supabase
              .from('subcategories')
              .select('name, slug, detail_type')
              .eq('id', product.subcategory_id)
              .single();
            
            if (subcategory) {
              subcategoryMap[item.product_id] = {
                name: subcategory.name,
                slug: subcategory.slug,
                detail_type: subcategory.detail_type
              };
            }
          }
        } catch (error) {
          console.error('Error fetching subcategory for product:', item.product_id, error);
        }
      }
      
      setProductSubcategories(prev => ({ ...prev, ...subcategoryMap }));
    };
    
    if (cartItems.length > 0 && !isDirectPurchase) {
      fetchSubcategoryInfo();
    }
  }, [cartItems, isDirectPurchase, supabase]);

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

  // Check URL params directly to detect direct purchase (in case state hasn't updated yet)
  // This ensures we detect direct purchase even before useEffect runs
  // IMPORTANT: Check on every render to catch production edge cases
  const checkDirectPurchaseFromUrl = () => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const direct = params.get('direct');
        const productId = params.get('productId');
        const quantity = params.get('quantity');
        return direct === 'true' && !!productId && !!quantity;
      } catch (e) {
        // Fallback if URL parsing fails
        return false;
      }
    }
    return false;
  };
  
  // Always check URL on render (for production reliability)
  const isDirectPurchaseFromUrl = checkDirectPurchaseFromUrl();
  const shouldShowDirectPurchase = isDirectPurchase || isDirectPurchaseFromUrl || initialIsDirectPurchase;
  
  // Determine if we're still waiting for direct purchase product to load
  // We're waiting if:
  // 1. We detected direct purchase, AND
  // 2. We don't have items yet, AND
  // 3. Either we're actively loading OR we haven't attempted to fetch yet (hasFetchedDirectProduct is false)
  const isWaitingForDirectProduct = shouldShowDirectPurchase && 
                                     directPurchaseItems.length === 0 && 
                                     (loadingDirectProduct || !hasFetchedDirectProduct.current);

  // Show loading state while:
  // 1. Cart is loading, OR
  // 2. We detected direct purchase but haven't loaded the product yet
  if (cartLoading || isWaitingForDirectProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {shouldShowDirectPurchase ? 'Loading product details...' : 'Loading checkout...'}
          </p>
        </div>
      </div>
    );
  }

  // Check if cart is empty and not a direct purchase
  // NEVER show "cart empty" if we've detected a direct purchase (even if product failed to load)
  // Only show "cart empty" if:
  // 1. Cart is empty AND
  // 2. We have NOT detected any direct purchase indicators (check URL one more time to be sure)
  // 3. Cart loading is complete
  const finalDirectPurchaseCheck = checkDirectPurchaseFromUrl() || shouldShowDirectPurchase;
  if (cartItems.length === 0 && !finalDirectPurchaseCheck && !cartLoading) {
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

  // If direct purchase was detected but items failed to load (after loading completed)
  if (shouldShowDirectPurchase && directPurchaseItems.length === 0 && !isWaitingForDirectProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
          <p className="text-gray-600 mb-6">The product you're trying to purchase is no longer available.</p>
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
      
      // Prepare order items data
      const orderItemsData = items.map((item) => {
        let sizeValue = null;
        
        // If it's a direct purchase, use the size from the item
        if (isDirectPurchase && (item as any).size) {
          sizeValue = (item as any).size;
        } else if (!isDirectPurchase && (item as any).size) {
          // For cart items, use the size from the cart item
          sizeValue = (item as any).size;
        }
        
        return {
          product_id: item.product.id,
          product_name: item.product.name,
          product_price: item.product.price,
          total_price: item.product.price * item.quantity,
          quantity: item.quantity,
          size: sizeValue
        };
      });
      
      // Handle payment based on payment method
      if (formData.paymentMethod === 'razorpay') {
        // For Razorpay: Don't create order yet - wait for payment verification
        // Pass order data to Razorpay handler
        await handleRazorpayPayment(orderNumber, orderItemsData, {
          subtotal,
          shipping,
          total,
          formData
        });
        return; // Don't clear cart or redirect yet - wait for payment completion
      }
      
      // For COD: Create order immediately with 'paid' status
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null,
          order_number: orderNumber,
          payment_method: 'cod',
          total_amount: total,
          status: 'paid', // COD orders are immediately paid
          payment_status: 'completed', // COD orders are completed
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
      
      // Create order items
      const orderItems = orderItemsData.map((item) => ({
        order_id: createdOrder.id,
        ...item
      }));
      
      const insertResult = await supabase
        .from('order_items')
        .insert(orderItems) as any;
      
      if (insertResult && insertResult.error) {
        console.error('Error creating order items:', insertResult.error);
        alert(`Failed to create order items. Please contact support.`);
        setIsProcessing(false);
        return;
      }
      
      // Update stock quantities
      try {
        const stockUpdateData = orderItemsData.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }));
        
        const stockResponse = await fetch('/api/orders/update-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stockUpdateData)
        });
        
        if (!stockResponse.ok) {
          console.warn('Stock update failed, but order was created:', await stockResponse.json());
          // Don't fail the order if stock update fails - log it for admin review
        }
      } catch (stockError) {
        console.error('Error updating stock:', stockError);
        // Don't fail the order if stock update fails
      }
      
      // Clear cart only if items were purchased from cart (not direct purchase)
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

  const handleRazorpayPayment = async (
    orderNumber: string,
    orderItemsData: any[],
    orderData: {
      subtotal: number;
      shipping: number;
      total: number;
      formData: CheckoutFormData;
    }
  ) => {
    // Check if Razorpay script is loaded
    if (!razorpayLoaded) {
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
      alert('Payment gateway failed to load. Please refresh the page and try again.');
      setIsProcessing(false);
      return;
    }

    try {
      // Verify user is logged in
      if (!user || !user.id) {
        alert('Please log in to continue with payment.');
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        setIsProcessing(false);
        return;
      }
      
      // Create Razorpay order (no database order created yet)
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: orderData.total,
          currency: 'INR',
          userId: user.id, // Send Firebase user ID
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment order');
      }

      const razorpayOrder = await response.json();

      // Check if key is available
      if (!razorpayOrder.key) {
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
            // Verify payment on server and create order
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderNumber: orderNumber,
                orderItems: orderItemsData,
                orderData: {
                  subtotal: orderData.subtotal,
                  shipping: orderData.shipping,
                  total: orderData.total,
                  formData: orderData.formData,
                },
                userId: user.id, // Send Firebase user ID
              }),
            });

            if (!verifyResponse.ok) {
              let errorData: any = {};
              const contentType = verifyResponse.headers.get('content-type');
              
              try {
                // Clone the response so we can read it multiple times
                const responseClone = verifyResponse.clone();
                
                if (contentType && contentType.includes('application/json')) {
                  errorData = await responseClone.json();
                } else {
                  const text = await responseClone.text();
                  errorData = { 
                    error: text || `Payment verification failed (${verifyResponse.status})`,
                    rawResponse: text
                  };
                }
              } catch (parseError: any) {
                // Try to get the raw text
                try {
                  const text = await verifyResponse.text();
                  errorData = { 
                    error: `Payment verification failed (${verifyResponse.status})`,
                    message: 'Could not parse error response',
                    rawResponse: text,
                    parseError: parseError.message
                  };
                } catch (textError) {
                  errorData = { 
                    error: `Payment verification failed (${verifyResponse.status})`,
                    message: 'Could not read error response',
                    status: verifyResponse.status,
                    statusText: verifyResponse.statusText
                  };
                }
              }
              
              // Build a comprehensive error message
              const errorMessage = errorData?.error || 
                                  errorData?.message || 
                                  errorData?.rawResponse ||
                                  `Payment verification failed (${verifyResponse.status})`;
              
              // Include details in the error message if available
              let fullErrorMessage = errorMessage;
              if (errorData?.details?.fullError?.message) {
                fullErrorMessage += `\nDatabase Error: ${errorData.details.fullError.message}`;
              } else if (errorData?.message) {
                fullErrorMessage += `\nDetails: ${errorData.message}`;
              }
              
              throw new Error(fullErrorMessage);
            }

            const result = await verifyResponse.json();
            const createdOrderId = result.order?.id;

            if (!createdOrderId) {
              console.error('Order creation failed - no order ID returned:', result);
              throw new Error('Order creation failed after payment. Please contact support with your payment ID.');
            }

            // Clear cart
            if (!isDirectPurchase) {
              await clearCart();
            }

            // Redirect to success page
            window.location.href = `/checkout/success?orderId=${createdOrderId}&orderNumber=${orderNumber}`;
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
            // Payment modal dismissed
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

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      setPaymentError(error.message || 'Payment failed. Please try again.');
      setShowPaymentFailedModal(true);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-4 md:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden p-6">
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
                {(() => {
                  // Show items based on purchase type
                  const itemsToShow = isDirectPurchase ? directPurchaseItems : cartItems;
                  
                  if (itemsToShow.length === 0) {
                    // If direct purchase is loading, show loading state
                    if (isDirectPurchase && loadingDirectProduct) {
                      return (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-gray-500">Loading product...</p>
                        </div>
                      );
                    }
                    // Otherwise show empty message
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Your cart is empty</p>
                        <Link href="/" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
                          Continue Shopping
                        </Link>
                      </div>
                    );
                  }
                  
                  return itemsToShow.map((item, index) => (
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
                          {(() => {
                            const productId = item.product.id || item.product_id;
                            const subcategoryInfo = productSubcategories[productId];
                            const detailType = subcategoryInfo 
                              ? getProductDetailType(
                                  subcategoryInfo.name,
                                  subcategoryInfo.slug,
                                  subcategoryInfo.detail_type
                                )
                              : 'none';
                            
                            // Only show size for apparel products
                            if (detailType === 'apparel' && item.size) {
                              return <span className="ml-2">| Size: {item.size}</span>;
                            }
                            return null;
                          })()}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        ₹{(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ));
                })()}
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
