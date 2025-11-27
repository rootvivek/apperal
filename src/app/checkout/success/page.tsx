'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import OrderConfirmation from '@/components/checkout/CheckoutPage/OrderConfirmation';
import { CheckoutFormData } from '@/lib/schemas/checkout';
import LoadingState from '@/components/checkout/shared/LoadingState';

interface OrderItem {
  id?: string;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string;
  };
  quantity: number;
}

interface OrderConfirmationData {
  orderNumber: string;
  orderId: string;
  formData: CheckoutFormData;
  orderedItems: OrderItem[];
  subtotal: number;
  total: number;
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderData, setOrderData] = useState<OrderConfirmationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First, try to get data from sessionStorage (from checkout page)
    const storedData = sessionStorage.getItem('orderConfirmation');
    
    if (storedData) {
      try {
        const data = JSON.parse(storedData) as OrderConfirmationData;
        setOrderData(data);
        setLoading(false);
        // Clear sessionStorage after reading
        sessionStorage.removeItem('orderConfirmation');
        return;
      } catch (error) {
        console.error('Error parsing order confirmation data:', error);
      }
    }

    // If no sessionStorage data, try to fetch from orderId in URL
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      // No order data available, redirect to home
      router.push('/');
      return;
    }

    // Fetch order data from database
    const fetchOrderData = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        // Fetch order details
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*, addresses(*)')
          .eq('id', orderId)
          .maybeSingle();
        
        if (orderError || !order) {
          console.error('Error fetching order:', orderError);
          router.push('/');
          return;
        }
        
        // Fetch order items
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*, products(id, name, price, image_url)')
          .eq('order_id', orderId);
        
        if (itemsError) {
          console.error('Error fetching order items:', itemsError);
          router.push('/');
          return;
        }

        // Transform data to match OrderConfirmationData format
        const address = order.addresses;
        const formData: CheckoutFormData = {
          fullName: address?.full_name || '',
          address: address?.address_line1 || '',
          city: address?.city || '',
          state: address?.state || '',
          zipCode: address?.zip_code || '',
          phone: address?.phone?.toString() || '',
          paymentMethod: order.payment_method as 'cod' | 'upi',
        };

        const orderedItems: OrderItem[] = (items || []).map((item: any) => ({
          id: item.id,
          product: {
            id: item.products?.id || item.product_id,
            name: item.products?.name || 'Product',
            price: item.product_price,
            image_url: item.products?.image_url || '/placeholder-product.jpg',
          },
          quantity: item.quantity,
        }));

        const subtotal = orderedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const total = order.total_price || subtotal;

        setOrderData({
          orderNumber: order.order_number,
          orderId: order.id,
          formData,
          orderedItems,
          subtotal,
          total,
        });
      } catch (error) {
        console.error('Error fetching order data:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [searchParams, router]);

  if (loading) {
    return <LoadingState message="Loading order confirmation..." />;
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Order not found</h1>
          <p className="text-muted-foreground mb-6">Unable to load order confirmation.</p>
        </div>
      </div>
    );
  }

  return (
    <OrderConfirmation
      orderNumber={orderData.orderNumber}
      orderId={orderData.orderId}
      formData={orderData.formData}
      orderedItems={orderData.orderedItems}
      subtotal={orderData.subtotal}
      total={orderData.total}
    />
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <LoadingState message="Loading order confirmation..." />
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
