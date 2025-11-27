import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutFormSchema, type CheckoutFormData } from '@/lib/schemas/checkout';
import { getStateName } from '@/lib/constants/states';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { useDirectPurchase } from '@/hooks/useDirectPurchase';
import { isAddressComplete, isValidPaymentMethod } from '@/components/checkout/CheckoutPage/validateCheckout';

interface UseCheckoutProps {
  onPaymentError: (error: string) => void;
  onShowPaymentFailedModal: (show: boolean) => void;
}

export function useCheckout({ onPaymentError, onShowPaymentFailedModal }: UseCheckoutProps) {
  const { user } = useAuth();
  const { cartItems, loading: cartLoading, clearCart } = useCart();
  const { openModal: openLoginModal } = useLoginModal();
  const { items: directPurchaseItems, isDirectPurchase, loading: loadingDirectProduct } = useDirectPurchase();
  const supabase = createClient();

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fullName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      paymentMethod: 'upi',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardName: '',
    },
  });

  const { watch, setValue, handleSubmit, formState: { isSubmitting } } = form;
  const paymentMethod = watch('paymentMethod');
  const [productSubcategories, setProductSubcategories] = useState<Record<string, { name: string | null; slug: string | null; detail_type: string | null }>>({});
  const [mounted, setMounted] = useState(false);

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

  // Generate order number
  const generateOrderNumber = useCallback(async (): Promise<string> => {
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
  }, [supabase]);

  // Handle COD order creation
  const createCODOrder = useCallback(async (
    orderNumber: string,
    orderItemsData: any[],
    shippingAddressId: string | null
  ) => {
    // Verify user session before creating order
    if (!user?.id) {
      throw new Error('Session expired. Please login again.');
    }
    
    if (!shippingAddressId) {
      throw new Error('Shipping address is required. Please try again.');
    }

    const orderData: any = {
      user_id: user.id,
      order_number: orderNumber,
      payment_method: 'cod',
      status: 'pending',
      payment_status: 'completed',
      shipping_address_id: shippingAddressId,
      subtotal: subtotal,
      shipping_cost: shipping,
      tax: 0,
      total_amount: total,
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
      throw new Error(errorMessage);
    }

    if (!order || (Array.isArray(order) && !order[0])) {
      throw new Error('Failed to place order. Please try again.');
    }

    const createdOrder = Array.isArray(order) ? order[0] : order;

    const orderItems = orderItemsData.map((item) => ({
      order_id: createdOrder.id,
      ...item,
    }));

    const { error: insertError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (insertError) {
      throw new Error('Failed to create order items. Please contact support.');
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

    return { orderId: createdOrder.id, orderNumber };
  }, [user?.id, subtotal, shipping, total, isDirectPurchase, clearCart, supabase]);

  // Handle form submission
  const onSubmit = useCallback(async (
    data: CheckoutFormData,
    selectedAddressId: string | null,
    onSuccess: (orderId: string, orderNumber: string) => void
  ) => {
    if (!user) {
      openLoginModal();
      return;
    }

    if (!isAddressComplete(data)) {
      throw new Error('ADDRESS_INCOMPLETE');
    }

    if (!isValidPaymentMethod(data.paymentMethod)) {
      onPaymentError('Please select a valid payment method');
      onShowPaymentFailedModal(true);
      return;
    }

    if (items.length === 0) {
      onPaymentError('Your cart is empty');
      onShowPaymentFailedModal(true);
      return;
    }

    try {
      const orderNumber = await generateOrderNumber();
      const orderItemsData = items.map((item) => ({
        product_id: item.product.id,
        product_price: item.product.price,
        total_price: item.product.price * item.quantity,
        quantity: item.quantity,
        size: (item as any).size || null,
      }));

      // Create or get address ID
      let shippingAddressId: string | null = null;
      
      if (selectedAddressId) {
        shippingAddressId = selectedAddressId;
      } else {
        // User entered new address - create it in addresses table
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
            is_default: false,
          })
          .select('id');

        if (addressResult.error || !addressResult.data?.[0]?.id) {
          throw new Error(`Failed to save address: ${addressResult.error?.message || 'Please try again.'}`);
        }
        shippingAddressId = addressResult.data[0].id;
      }

      if (data.paymentMethod === 'cod') {
        const result = await createCODOrder(orderNumber, orderItemsData, shippingAddressId);
        onSuccess(result.orderId, result.orderNumber);
        return;
      }

      // For UPI, return data for Razorpay handler
      return {
        orderNumber,
        orderItemsData,
        formData: data,
        shippingAddressId,
      };
    } catch (error: any) {
      if (error.message === 'ADDRESS_INCOMPLETE') {
        throw error;
      }
      onPaymentError(error.message || 'An error occurred. Please try again.');
      onShowPaymentFailedModal(true);
      throw error;
    }
  }, [
    user,
    items,
    generateOrderNumber,
    createCODOrder,
    openLoginModal,
    onPaymentError,
    onShowPaymentFailedModal,
    supabase,
  ]);

  const isLoading = !mounted || 
    (isDirectPurchase ? (loadingDirectProduct && items.length === 0) : cartLoading);

  return {
    form,
    items,
    subtotal,
    shipping,
    total,
    productSubcategories,
    paymentMethod,
    isSubmitting,
    isLoading,
    isDirectPurchase,
    loadingDirectProduct,
    mounted,
    onSubmit,
    setValue,
    watch,
    handleSubmit,
  };
}

