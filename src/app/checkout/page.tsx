'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { createClient } from '@/lib/supabase/client';
import { getProductDetailType } from '@/utils/productDetailsMapping';
import { checkoutFormSchema, type CheckoutFormData } from '@/lib/schemas/checkout';
import { INDIAN_STATES, getStateCode, getStateName } from '@/lib/constants/states';
import { useDirectPurchase } from '@/hooks/useDirectPurchase';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAddresses } from '@/hooks/useAddresses';
import LoadingLogo from '@/components/LoadingLogo';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Check } from 'lucide-react';

function CheckoutContent() {
  const { user } = useAuth();
  const { cartItems, loading: cartLoading, clearCart } = useCart();
  const { openModal: openLoginModal } = useLoginModal();
  const supabase = createClient();

  // Custom hooks
  const { items: directPurchaseItems, isDirectPurchase, loading: loadingDirectProduct } = useDirectPurchase();
  const { ensureLoaded: ensureRazorpayLoaded } = useRazorpay();
  const { addresses, loading: addressesLoading, saveAddress, updateAddress } = useAddresses();

  // Form state
  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fullName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '', // Phone is string in form, converted to number when saving
      paymentMethod: 'upi',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardName: '',
    },
  });

  const { watch, setValue, handleSubmit, formState: { errors, isSubmitting } } = form;
  const paymentMethod = watch('paymentMethod');

  // UI state
  const [mounted, setMounted] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showPaymentFailedModal, setShowPaymentFailedModal] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [productSubcategories, setProductSubcategories] = useState<Record<string, { name: string | null; slug: string | null; detail_type: string | null }>>({});

  // Determine items to show - prioritize direct purchase
  const items = useMemo(() => {
    return isDirectPurchase ? directPurchaseItems : cartItems;
  }, [isDirectPurchase, directPurchaseItems, cartItems]);

  // Calculate totals
  const subtotal = useMemo(() => items.reduce((total, item) => total + (item.product.price * item.quantity), 0), [items]);
  const shipping = 0; // Free shipping
  const total = subtotal + shipping;

  // Initialize component
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user data and addresses
  useEffect(() => {
    if (!user?.id) return;

    const fetchUserData = async () => {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .maybeSingle();

        // Get default address, or most recent if no default
        const { data: defaultAddress } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

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

        if (address) {
          const stateCode = getStateCode(address.state);
          setValue('fullName', profile?.full_name || '');
          setValue('phone', profile?.phone ? String(profile.phone) : '');
          setValue('address', address.address_line1 || '');
          setValue('city', address.city || '');
          setValue('state', stateCode || '');
          setValue('zipCode', address.zip_code || '');
          setSelectedAddressId(address.id);
        } else if (profile) {
          setValue('fullName', profile.full_name || '');
          setValue('phone', profile.phone ? String(profile.phone) : '');
        }
      } catch {
        // Error handled silently
      }
    };

    fetchUserData();
    // Note: fetchAddresses is automatically called by useAddresses hook, no need to call it here
  }, [user?.id, supabase, setValue]);

  // Fetch subcategory info (only for cart items, not direct purchase)
  useEffect(() => {
    if (items.length === 0 || isDirectPurchase) return;

    const fetchSubcategoryInfo = async () => {
      const itemsToFetch = items.filter(item => !productSubcategories[item.product.id]);
      if (itemsToFetch.length === 0) return;

      const subcategoryMap: Record<string, { name: string | null; slug: string | null; detail_type: string | null }> = {};

      await Promise.all(
        itemsToFetch.map(async (item) => {
          try {
            const { data: product } = await supabase
              .from('products')
              .select('subcategory_id')
              .eq('id', item.product.id)
              .single();

            if (product?.subcategory_id) {
              const { data: subcategory } = await supabase
                .from('subcategories')
                .select('name, slug, detail_type')
                .eq('id', product.subcategory_id)
                .single();

              if (subcategory) {
                subcategoryMap[item.product.id] = {
                  name: subcategory.name,
                  slug: subcategory.slug,
                  detail_type: subcategory.detail_type,
                };
              }
            }
          } catch {
            // Error handled silently
          }
        })
      );

      if (Object.keys(subcategoryMap).length > 0) {
        setProductSubcategories(prev => ({ ...prev, ...subcategoryMap }));
      }
    };

    fetchSubcategoryInfo();
  }, [items, isDirectPurchase, productSubcategories, supabase]);

  // Load Razorpay when payment method changes
  useEffect(() => {
    if (paymentMethod !== 'cod') {
      ensureRazorpayLoaded();
    }
  }, [paymentMethod, ensureRazorpayLoaded]);

  // Generate order number
  const generateOrderNumber = async (): Promise<string> => {
    const min = 1000;
    const max = 999999;

    for (let attempts = 0; attempts < 10; attempts++) {
      const orderNum = Math.floor(Math.random() * (max - min + 1)) + min;
      const orderNumber = `ORD-ID:${orderNum}`;

      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .maybeSingle();

      if (!existingOrder) {
        return orderNumber;
      }
    }

    return `ORD-ID:${Date.now().toString().slice(-6)}`;
  };

  // Handle Razorpay payment
  const handleRazorpayPayment = async (orderNumber: string, orderItemsData: any[], formData: CheckoutFormData, shippingAddressId: string | null) => {
    if (!user?.id) {
      openLoginModal();
      return;
    }

    const razorpayLoaded = await ensureRazorpayLoaded();
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
          userId: user.id,
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
        name: 'Apperal',
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
                userId: user.id,
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

            window.location.href = `/checkout/success?orderId=${result.order.id}&orderNumber=${orderNumber}`;
          } catch (error: any) {
            setPaymentError(error.message || 'Payment verification failed. Please contact support.');
            setShowPaymentFailedModal(true);
          }
        },
        prefill: {
          name: formData.fullName,
          contact: formData.phone, // Razorpay expects string for contact
        },
        theme: { color: '#4736FE' },
        modal: {
          ondismiss: () => {
            // Payment modal dismissed
          },
        },
        onError: (error: any) => {
          setPaymentError(error.error?.description || error.error?.reason || 'Payment failed. Please try again.');
          setShowPaymentFailedModal(true);
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      setPaymentError(error.message || 'Payment failed. Please try again.');
      setShowPaymentFailedModal(true);
      throw error;
    }
  };

  // Handle form submission
  const onSubmit = async (data: CheckoutFormData) => {
    if (!user) {
      openLoginModal();
      return;
    }

    const isAddressComplete = !!(
      data.fullName?.trim() &&
      data.address?.trim() &&
      data.city?.trim() &&
      data.state?.trim() &&
      data.zipCode?.trim().length === 6
    );

    if (!isAddressComplete) {
      setShowAddressModal(true);
      return;
    }

    if (!data.paymentMethod || (data.paymentMethod !== 'cod' && data.paymentMethod !== 'upi')) {
      setPaymentError('Please select a valid payment method');
      setShowPaymentFailedModal(true);
      return;
    }

    if (items.length === 0) {
      setPaymentError('Your cart is empty');
      setShowPaymentFailedModal(true);
      return;
    }

    try {
      const orderNumber = await generateOrderNumber();
      const orderItemsData = items.map((item) => ({
        product_id: item.product.id,
        product_price: item.product.price, // Price at time of purchase (for historical accuracy)
        total_price: item.product.price * item.quantity,
        quantity: item.quantity,
        size: (item as any).size || null,
      }));

      // Create or get address ID
      let shippingAddressId: string | null = null;
      
      if (selectedAddressId) {
        // User selected existing address
        shippingAddressId = selectedAddressId;
      } else {
        // User entered new address - create it in addresses table
        // Include full_name and phone from checkout form (this is what was used for the order)
        const stateName = getStateName(data.state) || data.state;
        const addressResult = await supabase
          .from('addresses')
          .insert({
            user_id: user.id,
            address_line1: data.address,
            city: data.city,
            state: stateName,
            zip_code: data.zipCode,
            full_name: data.fullName.trim() || null,
            phone: data.phone ? parseInt(data.phone, 10) : null,
            is_default: false, // Don't set as default automatically
          })
          .select('id');

        if (addressResult.error || !addressResult.data?.[0]?.id) {
          alert(`Failed to save address: ${addressResult.error?.message || 'Please try again.'}`);
          return;
        }
        shippingAddressId = addressResult.data[0].id;
      }

      if (data.paymentMethod !== 'cod') {
        await handleRazorpayPayment(orderNumber, orderItemsData, data, shippingAddressId);
        return;
      }

      // Validate shipping address ID before creating order
      if (!shippingAddressId) {
        alert('Shipping address is required. Please try again.');
        return;
      }

      // COD: Create order immediately
      // Orders table uses normalized structure: only shipping_address_id, no customer_name/phone
      const orderData: any = {
        user_id: user.id,
        order_number: orderNumber,
        payment_method: 'cod',
        status: 'pending', // Changed from 'paid' to 'pending' to match standard flow
        payment_status: 'completed',
        shipping_address_id: shippingAddressId, // Required - validated above
        subtotal: subtotal,
        shipping_cost: shipping,
        tax: 0,
        total_amount: total, // Use total_amount (total column removed)
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select('id');

      if (orderError) {
        const errorMessage = orderError.code === '42703' 
          ? 'Failed to place order. Database schema error. Please contact support.'
          : orderError.code === '23503'
          ? 'Failed to place order. Invalid shipping address. Please try again.'
          : `Failed to place order. ${orderError.message || 'Please try again.'}`;
        alert(errorMessage);
        return;
      }

      if (!order || (Array.isArray(order) && !order[0])) {
        alert('Failed to place order. Please try again.');
        return;
      }

      const createdOrder = Array.isArray(order) ? order[0] : order;

      const orderItems = orderItemsData.map((item) => ({
        order_id: createdOrder.id,
        ...item,
      }));

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select()
        .then(result => result);

      if (insertError) {
        alert('Failed to create order items. Please contact support.');
        return;
      }

      // Update stock
      try {
        await fetch('/api/orders/update-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderItemsData.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
          }))),
        });
      } catch {
        // Don't fail order if stock update fails
      }

      if (!isDirectPurchase) {
        await clearCart();
      }

      window.location.href = `/checkout/success?orderId=${createdOrder.id}&orderNumber=${orderNumber}`;
    } catch (error: any) {
      setPaymentError(error.message || 'An error occurred. Please try again.');
      setShowPaymentFailedModal(true);
    }
  };

  // Handle address selection
  const handleAddressSelect = (address: any) => {
    setSelectedAddressId(address.id);
    const stateCode = getStateCode(address.state);
    setValue('fullName', address.full_name || '');
    setValue('phone', address.phone ? String(address.phone) : '');
    setValue('address', address.address_line1 || '');
    setValue('city', address.city || '');
    setValue('state', stateCode || '');
    setValue('zipCode', address.zip_code || '');
  };

  // Handle address save
  const handleAddressSave = async (data: CheckoutFormData) => {
    if (!user?.id) return;

    const stateName = getStateName(data.state) || data.state;

    if (editingAddressId) {
      const result = await updateAddress(editingAddressId, {
        address_line1: data.address.trim(),
        full_name: data.fullName.trim() || undefined,
        city: data.city.trim(),
        state: stateName,
        zip_code: data.zipCode.trim(),
        phone: data.phone ? parseInt(data.phone, 10) : undefined,
      });

      if (result) {
        setShowAddressModal(false);
        setEditingAddressId(null);
        setSelectedAddressId(editingAddressId);
      }
    } else {
      if (addresses.length >= 3) {
        alert('You have reached the maximum limit of 3 addresses.');
        return;
      }

      const result = await saveAddress({
        address_line1: data.address.trim(),
        full_name: data.fullName.trim() || undefined,
        city: data.city.trim(),
        state: stateName,
        zip_code: data.zipCode.trim(),
        phone: data.phone ? parseInt(data.phone, 10) : undefined,
        is_default: true,
      });

      if (result) {
        setShowAddressModal(false);
        setSelectedAddressId(result.id);
      }
    }
  };

  // Loading states
  const isLoading = !mounted || 
    (isDirectPurchase ? (loadingDirectProduct && items.length === 0) : cartLoading);
  
  if (isLoading) {
    const loadingText = mounted && isDirectPurchase ? 'Loading product details...' : 'Loading checkout...';
    return <LoadingLogo fullScreen text={loadingText} />;
  }

  // Empty cart check - skip if it's a direct purchase
  if (items.length === 0 && !isDirectPurchase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-6">Add some items to your cart before checkout</p>
          <Link href="/">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Direct purchase product not found
  if (isDirectPurchase && items.length === 0 && !loadingDirectProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
          <p className="text-gray-600 mb-6">The product you're trying to purchase is no longer available.</p>
          <Link href="/">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAddressComplete = !!(
    watch('fullName')?.trim() &&
    watch('address')?.trim() &&
    watch('city')?.trim() &&
    watch('state')?.trim() &&
    watch('zipCode')?.trim().length === 6
  );

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-[1450px] mx-auto w-full">
        <div className="bg-white">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Checkout Form */}
            <div className="order-2 lg:order-1">
              <Form {...form}>
                <form 
                  id="checkout-form" 
                  onSubmit={handleSubmit(
                    onSubmit,
                    (errors) => {
                      // Log validation errors for debugging
                      if (Object.keys(errors).length > 0) {
                        setPaymentError('Please fill in all required fields correctly');
                        setShowPaymentFailedModal(true);
                      }
                    }
                  )} 
                  className="space-y-0"
                >
                  {/* Shipping Address */}
                  <div className="px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm sm:text-lg font-semibold">Shipping Address</h2>
                      {addresses.length < 3 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingAddressId(null);
                            setValue('address', '');
                            setValue('city', '');
                            setValue('state', '');
                            setValue('zipCode', '');
                            setValue('fullName', '');
                            setValue('phone', '');
                            setShowAddressModal(true);
                            // Don't clear selectedAddressId - allow adding new address while keeping selection
                          }}
                        >
                          + Add Address
                        </Button>
                      )}
                      {addresses.length >= 3 && (
                        <span className="text-xs sm:text-sm text-muted-foreground">Maximum 3 addresses allowed</span>
                      )}
                    </div>
                    <div>
                      {addresses.length > 0 ? (
                        <div className="space-y-3 mb-4">
                          {addresses.map((address) => (
                            <div
                              key={address.id}
                              className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                                selectedAddressId === address.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-gray-200'
                              }`}
                              onClick={() => handleAddressSelect(address)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {address.is_default && (
                                    <span className="inline-block mb-2 px-2 py-1 text-xs font-semibold text-primary bg-primary/10 rounded">
                                      Default
                                    </span>
                                  )}
                                  <p className="font-medium mb-1">{address.full_name || watch('fullName') || 'Address'}</p>
                                  <p className="text-sm text-muted-foreground">{address.address_line1}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {address.city}, {address.state} {address.zip_code}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  {selectedAddressId === address.id && (
                                    <Check className="w-5 h-5 text-primary" />
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingAddressId(address.id);
                                      handleAddressSelect(address);
                                      setShowAddressModal(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : !addressesLoading && !isAddressComplete ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-dashed"
                          onClick={() => {
                            setEditingAddressId(null);
                            setValue('address', '');
                            setValue('city', '');
                            setValue('state', '');
                            setValue('zipCode', '');
                            setValue('fullName', '');
                            setSelectedAddressId(null);
                            setShowAddressModal(true);
                          }}
                        >
                          Add New Address
                        </Button>
                      ) : addressesLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Loading addresses...</p>
                        </div>
                      ) : null}

                      {/* Address Form Fields (hidden when address selected or addresses are loading) */}
                      {!addressesLoading && !selectedAddressId && addresses.length === 0 && (
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Street address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="state"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select state" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {INDIAN_STATES.map((state) => (
                                        <SelectItem key={state.code} value={state.code}>
                                          {state.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter your city" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="zipCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ZIP Code *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="123456"
                                      maxLength={6}
                                      {...field}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        field.onChange(value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="1234567890 or +911234567890"
                                    maxLength={13}
                                    {...field}
                                    onChange={(e) => {
                                      // Remove +91 prefix if present, then remove all non-digits
                                      let value = e.target.value.replace(/^\+91\s*/, '').replace(/\D/g, '');
                                      // Limit to 10 digits
                                      if (value.length > 10) {
                                        value = value.slice(0, 10);
                                      }
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="px-3 sm:px-4">
                    <div className="border-t border-gray-200"></div>
                  </div>

                  {/* Payment Method */}
                  <div className="px-3 sm:px-4 py-3 sm:py-4">
                    <h2 className="text-sm sm:text-lg font-semibold mb-4">Payment Method</h2>
                    <div>
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="space-y-0"
                              >
                                <div className={`flex items-center space-x-2 p-4 border rounded-lg transition-colors cursor-pointer ${
                                  field.value === 'upi' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                                }`}>
                                  <RadioGroupItem value="upi" id="upi" />
                                  <Label htmlFor="upi" className="flex-1 cursor-pointer">
                                    <div className="font-medium">UPI</div>
                                    <div className="text-sm text-muted-foreground">
                                      Pay with UPI apps like PhonePe, Google Pay, Paytm
                                    </div>
                                  </Label>
                                </div>
                                <div className={`flex items-center space-x-2 p-4 border rounded-lg transition-colors cursor-pointer ${
                                  field.value === 'cod' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                                }`}>
                                  <RadioGroupItem value="cod" id="cod" />
                                  <Label htmlFor="cod" className="flex-1 cursor-pointer">
                                    <div className="font-medium">Cash on Delivery</div>
                                    <div className="text-sm text-muted-foreground">Pay cash when your order arrives</div>
                                  </Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Submit Button - Desktop */}
                  <div className="hidden sm:block px-3 sm:px-4 pb-3 sm:pb-4">
                    <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
                      {isSubmitting
                        ? 'Processing...'
                        : paymentMethod === 'cod'
                        ? 'Place Order (Cash on Delivery)'
                        : paymentMethod === 'upi'
                        ? 'Pay with UPI'
                        : 'Proceed to Payment'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1 order-1 lg:order-2">
              <OrderSummary
                items={items}
                subtotal={subtotal}
                shipping={shipping}
                total={total}
                productSubcategories={productSubcategories}
                loading={loadingDirectProduct}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Payment Button - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-white border-t shadow-lg z-50 px-3 py-4 sm:hidden">
        <Button
          type="submit"
          form="checkout-form"
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting
            ? 'Processing...'
            : paymentMethod === 'cod'
            ? 'Place Order (Cash on Delivery)'
            : paymentMethod === 'upi'
            ? 'Pay with UPI'
            : 'Proceed to Payment'}
        </Button>
      </div>

      {/* Address Modal */}
      <Dialog open={showAddressModal} onOpenChange={(open) => {
        setShowAddressModal(open);
        if (!open) {
          setEditingAddressId(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddressId ? 'Edit Address' : 'Add New Address'}</DialogTitle>
            <DialogDescription>
              {editingAddressId ? 'Update your address details below.' : 'Add a new shipping address for your order.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleSubmit(handleAddressSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDIAN_STATES.map((state) => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456"
                          maxLength={6}
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1234567890 or +911234567890"
                        maxLength={13}
                        {...field}
                        onChange={(e) => {
                          // Remove +91 prefix if present, then remove all non-digits
                          let value = e.target.value.replace(/^\+91\s*/, '').replace(/\D/g, '');
                          // Limit to 10 digits
                          if (value.length > 10) {
                            value = value.slice(0, 10);
                          }
                          // Keep as string for form (converted to number when saving)
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddressModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Address</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Failed Modal */}
      <Dialog open={showPaymentFailedModal} onOpenChange={setShowPaymentFailedModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Failed</DialogTitle>
            <DialogDescription>
              {paymentError || 'Your payment could not be processed. Please try again.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentFailedModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowPaymentFailedModal(false);
              const paymentSection = document.querySelector('[name="paymentMethod"]');
              if (paymentSection) {
                paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}>
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <LoadingLogo size="md" text="" />
            <p className="text-gray-600">Loading checkout...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

