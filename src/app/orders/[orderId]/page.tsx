'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import OrderDetail, { OrderDetailData } from '@/components/orders/OrderDetail';
import { Spinner } from '@/components/ui/spinner';
import ErrorState from '@/components/ErrorState';

function OrderDetailContent() {
  const params = useParams();
  const supabase = createClient();
  const { user } = useAuth();
  const orderId = params.orderId as string;
  
  const [orderItemId, setOrderItemId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const itemId = searchParams.get('item');
      const expId = searchParams.get('expandedId');
      setOrderItemId(itemId);
      setExpandedId(expId);
    }
  }, []);

  useEffect(() => {
    if (user && orderId) {
      fetchOrderDetails();
    }
  }, [user, orderId, orderItemId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (orderError) throw orderError;

      if (!orderData) {
        setError('Order not found');
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          cancelled_quantity,
          products:product_id (
            name,
            image_url
          )
        `)
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      const itemsWithImages = (itemsData || []).map((item: any) => {
        const product = item.products || {};
        const cancelledQty = item.cancelled_quantity || 0;
        const activeQty = item.quantity - cancelledQty;
        const isFullyCancelled = activeQty === 0;
        
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: product.name || 'Product not found',
          product_image: product.image_url || null,
          product_price: item.product_price,
          quantity: item.quantity,
          total_price: item.product_price * activeQty,
          size: item.size,
          is_cancelled: isFullyCancelled,
          cancelled_quantity: cancelledQty
        };
      });

      let activeItems = itemsWithImages.filter((item: any) => item !== null) as any[];

      if (orderItemId) {
        const orderItem = activeItems.find(item => item.id === orderItemId);
        
        if (orderItem) {
          activeItems = [{
            ...orderItem,
            total_price: orderItem.product_price,
          }];
        } else {
          activeItems = [];
        }
      }

      setOrder({
        id: orderData.id,
        order_number: orderData.order_number,
        status: orderData.status,
        payment_method: orderData.payment_method,
        payment_status: orderData.payment_status,
        total_amount: orderData.total_amount,
        created_at: orderData.created_at,
        items: activeItems
      });

      if ((orderData as any).shipping_address_id) {
        const { data: addressData } = await supabase
          .from('addresses')
          .select('*')
          .eq('id', (orderData as any).shipping_address_id)
          .single();

        if (addressData) {
          setShippingAddress(addressData);
          setCustomerName(addressData.full_name || 'N/A');
          setCustomerPhone(addressData.phone ? String(addressData.phone) : 'N/A');
        }
      } else {
        const { data: addressData } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user?.id)
          .order('is_default', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (addressData) {
          setShippingAddress(addressData);
          setCustomerName(addressData.full_name || 'N/A');
          setCustomerPhone(addressData.phone ? String(addressData.phone) : 'N/A');
        }
      }
    } catch (err: any) {
      // Error handled silently
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <Spinner className="size-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <ErrorState
            title={error || 'Order not found'}
            message="The order you're looking for doesn't exist or you don't have permission to view it."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1450px] mx-auto w-full p-2.5">
        {/* Order Detail Component */}
        <OrderDetail 
          order={order} 
          showCustomerInfo={true}
          customerName={customerName}
          customerPhone={customerPhone}
          shippingAddress={shippingAddress}
          onOrderUpdate={(updatedOrder) => {
            setOrder(updatedOrder);
          }}
        />
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <AuthGuard>
      <OrderDetailContent />
    </AuthGuard>
  );
}

