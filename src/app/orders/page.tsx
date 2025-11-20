'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import EmptyState from '@/components/EmptyState';
import LoadingLogo from '@/components/LoadingLogo';
import ImageWithFallback from '@/components/ImageWithFallback';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status?: string;
  created_at: string;
}

interface ExpandedOrderItem {
  id: string;
  order_id: string;
  order_item_id: string; // Original order_item id
  order_number: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  product_price: number;
  quantity: number;
  total_price: number;
  size?: string | null;
  status: string;
  payment_method: string;
  created_at: string;
  is_cancelled?: boolean;
}

function OrdersContent() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const [expandedOrderItems, setExpandedOrderItems] = useState<ExpandedOrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      // Fetch all orders for user
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      // Show all paid/completed orders, even if all items are cancelled
      // This allows users to see their cancelled items separately
      const paidOrders = (data || []).filter((order: Order) => 
        order.status === 'paid' || 
        order.payment_status === 'completed' ||
        (order.status !== 'cancelled' && order.payment_status !== 'failed')
      );
      
      // Fetch all order items and expand them into separate entries
      const allExpandedItems: ExpandedOrderItem[] = [];
      
      for (const order of paidOrders) {
        try {
          // Fetch all order items for this order with product data (JOIN)
          const { data: itemsData } = await supabase
            .from('order_items')
            .select(`
              *,
              products:product_id (
                name,
                image_url
              )
            `)
            .eq('order_id', order.id);
          
          if (itemsData) {
            // Process items with product data from JOIN
            const itemsWithImages = itemsData.map((item: any) => {
              const product = item.products || {};
              return {
                ...item,
                product_name: product.name || 'Product not found',
                product_image: product.image_url || null
              };
            });
            
            // Expand items with quantity > 1 into separate entries (one card per quantity)
            itemsWithImages.forEach((item: any) => {
              const cancelledQty = item.cancelled_quantity || 0;
              const activeQty = item.quantity - cancelledQty;
              
              // Expand active items - one card per quantity
              for (let i = 0; i < activeQty; i++) {
                allExpandedItems.push({
                  id: `${item.id}-${i}`,
                  order_id: order.id,
                  order_item_id: item.id, // Store original order_item id
                  order_number: order.order_number,
                  product_id: item.product_id,
                  product_name: item.product_name,
                  product_image: item.product_image,
                  product_price: item.product_price,
                  quantity: 1, // Each card represents 1 quantity
                  total_price: item.product_price,
                  size: item.size,
                  status: order.status,
                  payment_method: order.payment_method,
                  created_at: order.created_at,
                  is_cancelled: false
                });
              }
              
              // Expand cancelled items - one card per cancelled quantity
              for (let i = 0; i < cancelledQty; i++) {
                allExpandedItems.push({
                  id: `${item.id}-cancelled-${i}`,
                  order_id: order.id,
                  order_item_id: item.id,
                  order_number: order.order_number,
                  product_id: item.product_id,
                  product_name: item.product_name,
                  product_image: item.product_image,
                  product_price: item.product_price,
                  quantity: 1, // Each card represents 1 quantity
                  total_price: item.product_price,
                  size: item.size,
                  status: 'cancelled',
                  payment_method: order.payment_method,
                  created_at: order.created_at,
                  is_cancelled: true
                });
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching order items for order ${order.id}:`, error);
        }
      }
      
      setExpandedOrderItems(allExpandedItems);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setExpandedOrderItems([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => `₹${(value || 0).toFixed(2)}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (ordersLoading) {
    return <LoadingLogo fullScreen text="Loading your orders..." />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1450px] mx-auto w-full">
        <div className="px-3 sm:px-4 py-3 sm:py-4">
          <h1 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2">My Orders</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            {expandedOrderItems.length === 0 
              ? "You haven't placed any orders yet." 
              : `You have ${expandedOrderItems.length} item${expandedOrderItems.length === 1 ? '' : 's'}.`
            }
          </p>
        </div>

        {expandedOrderItems.length === 0 ? (
          <div className="px-3 sm:px-4">
            <EmptyState
              icon="🛍️"
              title="No orders yet"
              description="Start shopping to see your orders here."
              actionLabel="Browse Products"
              actionHref="/products"
              variant="default"
              className="bg-white"
            />
          </div>
        ) : (
          <div>
            {expandedOrderItems.map((item, index) => (
              <div key={item.id}>
                {index > 0 && (
                  <div className="px-3 sm:px-4">
                    <div className="border-t border-gray-200"></div>
                  </div>
                )}
                <div 
                  className={`px-3 sm:px-4 py-3 sm:py-4 hover:bg-gray-50 transition-colors ${item.is_cancelled ? 'opacity-60' : 'cursor-pointer'}`}
                  onClick={() => !item.is_cancelled && router.push(`/orders/${item.order_id}?item=${item.order_item_id}&expandedId=${item.id}`)}
                >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {item.product_image ? (
                        <ImageWithFallback
                          src={item.product_image}
                          alt={item.product_name || 'Product'}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                          fallbackType="product"
                          loading="lazy"
                          decoding="async"
                          width={256}
                          height={256}
                          responsive={true}
                          responsiveSizes={[96, 192, 256]}
                          quality={85}
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      {/* Product Name */}
                      <p className="text-base font-semibold text-gray-900 mb-1">
                        {item.product_name || `Order #${item.order_number}`}
                      </p>
                      {/* Order Number */}
                      <p className="text-xs text-gray-500 mb-1">Order #{item.order_number}</p>
                      {/* Purchase Date */}
                      <p className="text-sm text-gray-600 mb-1">{formatDate(item.created_at)}</p>
                      {/* Payment Method */}
                      <p className="text-sm text-gray-600">
                        {item.payment_method === 'cod' ? 'Cash on Delivery' : item.payment_method.charAt(0).toUpperCase() + item.payment_method.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium mb-2 ${getStatusColor(item.is_cancelled ? 'cancelled' : item.status)}`}>
                      {item.is_cancelled ? 'Cancelled' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(item.total_price)}</p>
                    <p className="text-xs text-gray-500 mt-1">Price</p>
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  );
}

