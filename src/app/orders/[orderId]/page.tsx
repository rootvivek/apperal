'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import OrderDetail, { OrderDetailData } from '@/components/OrderDetail';
import LoadingLogo from '@/components/LoadingLogo';
import ErrorState from '@/components/ErrorState';

function OrderDetailContent() {
  const params = useParams();
  const supabase = createClient();
  const { user } = useAuth();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && orderId) {
      fetchOrderDetails();
    }
  }, [user, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch order
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

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*, cancelled_quantity')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Fetch product images for each item
      const itemsWithImages = await Promise.all(
        (itemsData || []).map(async (item: any) => {
          let productImage = item.product_image;

          // Fetch from products table if needed
          if (item.product_id) {
            const { data: productData } = await supabase
              .from('products')
              .select('image_url')
              .eq('id', item.product_id)
              .maybeSingle();

            if (productData?.image_url) {
              productImage = productData.image_url;
            }
          }

          const cancelledQty = item.cancelled_quantity || 0;
          const activeQty = item.quantity - cancelledQty;
          
          // Only return active items (non-cancelled)
          if (activeQty > 0) {
            return {
              id: item.id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_image: productImage || null,
              product_price: item.product_price,
              quantity: activeQty, // Show only active quantity
              total_price: item.product_price * activeQty,
              size: item.size,
              is_cancelled: false,
              cancelled_quantity: cancelledQty
            };
          }
          return null;
        })
      );

      // Filter out null values (fully cancelled items)
      const activeItems = itemsWithImages.filter(item => item !== null) as any[];

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
    } catch (err: any) {
      console.error('Error fetching order details:', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingLogo fullScreen text="Loading order details..." />;
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
      <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-2 md:px-3 lg:px-4 py-8">
        {/* Order Detail Component */}
        <OrderDetail 
          order={order} 
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

