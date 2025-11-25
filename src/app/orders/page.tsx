'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import EmptyState from '@/components/EmptyState';
import { Spinner } from '@/components/ui/spinner';
import ImageWithFallback from '@/components/ImageWithFallback';
import { mobileTypography } from '@/utils/mobileTypography';
import { Card, CardContent } from '@/components/ui/card';

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
          // Error handled silently
        }
      }
      
      setExpandedOrderItems(allExpandedItems);
    } catch (error: any) {
      // Error handled silently
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
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <Spinner className="size-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1450px] mx-auto w-full p-2.5">
        {expandedOrderItems.length === 0 ? (
          <div className="mt-3 sm:mt-4">
            <Card className="rounded-[4px]">
              <CardContent className="p-2.5">
                <EmptyState
                  icon="🛍️"
                  title="No orders yet"
                  description="Start shopping to see your orders here."
                  actionLabel="Browse Products"
                  actionHref="/products"
                  variant="default"
                  className="bg-white"
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-2">
            {expandedOrderItems.map((item) => (
              <Card 
                key={item.id}
                className={`rounded-[4px] transition-all ${item.is_cancelled ? 'opacity-60' : 'cursor-pointer hover:shadow-md'}`}
                onClick={() => !item.is_cancelled && router.push(`/orders/${item.order_id}?item=${item.order_item_id}&expandedId=${item.id}`)}
              >
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        {item.product_image ? (
                          <ImageWithFallback
                            src={item.product_image}
                            alt={item.product_name || 'Product'}
                            className="w-14 h-14 sm:w-16 sm:h-16 object-cover border border-gray-200"
                            fallbackType="product"
                            loading="lazy"
                            decoding="async"
                            width={64}
                            height={64}
                            responsive={true}
                            responsiveSizes={[48, 64, 80]}
                            quality={85}
                          />
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 flex items-center justify-center border border-gray-200">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        {/* Product Name */}
                        <p className="text-[12px] sm:text-sm font-semibold text-gray-900 line-clamp-1 mb-1">
                          {item.product_name || 'Product'}
                        </p>
                        {/* Purchase Date */}
                        <p className="text-[11px] sm:text-xs text-gray-600">{formatDate(item.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full ${mobileTypography.cap10} sm:text-xs font-medium mb-2 ${getStatusColor(item.is_cancelled ? 'cancelled' : item.status)}`}>
                        {item.is_cancelled ? 'Cancelled' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                      <p className="text-sm sm:text-base font-normal text-gray-900">{formatCurrency(item.total_price)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

