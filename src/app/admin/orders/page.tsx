'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { OrderDetailsModal } from '@/components/admin/orders/OrderDetailsModal';
import { updateOrderStatus } from '@/hooks/admin/useOrderActions';
import { formatAdminDate, formatAdminCurrency } from '@/utils/adminFormat';

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  notes?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  first_item_image?: string;
  item_count?: number;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  product_price: number;
  quantity: number;
  total_price: number;
  size?: string | null;
}

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  
  // Lock body scroll when modal is open
  useBodyScrollLock(showOrderDetails);
  const [userName, setUserName] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [userAddress, setUserAddress] = useState<any>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false }) as any;
      
      const ordersWithImages = await Promise.all(
        (data || []).map(async (order: Order) => {
          let firstItemImage = null;
          let itemCount = 0;
          
          try {
            const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select('product_image')
            .eq('order_id', order.id)
              .limit(1);
            
            if (!itemsError && itemsData && itemsData.length > 0) {
              firstItemImage = itemsData[0]?.product_image || null;
            }
          } catch (error) {
            // Silently handle error - firstItemImage remains null
          }
          
          try {
            const { count, error: countError } = await supabase
            .from('order_items')
            .select('*', { count: 'exact', head: true })
              .eq('order_id', order.id);
            
            if (!countError) {
              itemCount = count || 0;
            }
          } catch (error) {
            // Silently handle error - itemCount remains 0
          }
          
          return {
            ...order,
            first_item_image: firstItemImage,
            item_count: itemCount
          };
        })
      );
      setOrders(ordersWithImages);
    } catch (error) {
      // Error handled silently - orders state remains empty
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOrderClick = async (order: Order) => {
    setSelectedOrder(order);
    try {
      // Fetch order items with product data (JOIN)
      const { data: itemsData } = await supabase
        .from('order_items')
        .select(`
          *,
          products:product_id (
            name,
            image_url
          )
        `)
        .eq('order_id', order.id) as any;
      
      // Process items with product data from JOIN
      const itemsWithImages = (itemsData || []).map((item: any) => {
        const product = item.products || {};
        return {
          ...item,
          product_name: product.name || 'Product not found',
          product_image: product.image_url || null
        };
      });
      
      setOrderItems(itemsWithImages);
      
      // Fetch user information if user_id exists
      if (order.user_id) {
        // Priority 1: Check if order has shipping_address_id (new normalized approach)
        // Fetch customer name and phone from the address used for the order
        if ((order as any).shipping_address_id) {
          const { data: addressData } = await supabase
            .from('addresses')
            .select('*')
            .eq('id', (order as any).shipping_address_id)
            .single() as any;
          
          setUserAddress(addressData || null);
          
          // Fetch customer info from address (this is what was used for the order)
          setUserName(addressData?.full_name || 'N/A');
          setUserPhone(addressData?.phone ? String(addressData.phone) : 'N/A');
        } 
        // Priority 2: Check if address is stored directly in the order (old orders - backward compatibility)
        else if ((order as any).shipping_address) {
          setUserAddress({
            address_line1: (order as any).shipping_address || '',
            address_line2: (order as any).shipping_address_line2 || null,
            city: (order as any).shipping_city || '',
            state: (order as any).shipping_state || '',
            zip_code: (order as any).shipping_zip_code || '',
            country: (order as any).shipping_country || 'India'
          });
          // Old orders don't have name/phone in address, show N/A
          setUserName('N/A');
          setUserPhone('N/A');
        } 
        // Priority 3: Try to fetch default address for user
        else {
          const { data: addressData } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', order.user_id)
            .order('is_default', { ascending: false })
            .limit(1)
            .maybeSingle() as any;
          
          setUserAddress(addressData || null);
          // Fetch customer info from address
          setUserName(addressData?.full_name || 'N/A');
          setUserPhone(addressData?.phone ? String(addressData.phone) : 'N/A');
        }
      } else {
        // Guest order - no user_id means no address available
        setUserName('Guest User');
        setUserPhone('N/A');
        
        // Use shipping address from order if available
        if ((order as any).shipping_address) {
          setUserAddress({
            address_line1: (order as any).shipping_address || '',
            address_line2: (order as any).shipping_address_line2 || null,
            city: (order as any).shipping_city || '',
            state: (order as any).shipping_state || '',
            zip_code: (order as any).shipping_zip_code || ''
          });
        } else {
          setUserAddress(null);
        }
      }
    } catch (error) {
      // Error handled silently
    }
    setShowOrderDetails(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    await updateOrderStatus({
      supabase,
      orderId,
      newStatus,
      orders,
      setOrders,
      selectedOrder,
      setSelectedOrder,
    });
  };

  const formatDate = formatAdminDate;
  const formatCurrency = formatAdminCurrency;

  return (
    <AdminLayout>
      <div className="space-y-1">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm sm:text-base text-gray-600">View and manage all orders</p>
        </div>

        <div className="bg-white rounded-lg shadow p-1 space-y-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1">
            <Input
              type="text"
              placeholder="Search orders by number..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="flex-1 text-sm sm:text-base"
            />
            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
              Found {orders.filter(o => o.order_number?.toLowerCase().includes(orderSearch.toLowerCase())).length} orders
            </span>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            {ordersLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading orders...</p>
              </div>
            ) : (() => {
              const filteredOrders = orders.filter(order => !orderSearch || order.order_number?.toLowerCase().includes(orderSearch.toLowerCase()));

              if (filteredOrders.length === 0) {
                return <div className="text-center py-12"><p className="text-gray-600">No orders found</p></div>;
              }

              return filteredOrders.map((order) => {
                // For guest orders, show customer name if available, otherwise show "Guest User"
                // For registered users, show user number or shortened ID
                const userDisplayId = order.user_id === 'guest' || !order.user_id
                  ? ((order as any).customer_name || 'Guest User')
                  : `User ID: ${order.user_id.substring(0, 8)}...`;

                return (
                  <div 
                    key={order.id} 
                    className="border rounded-lg bg-white hover:shadow-md transition-shadow md:cursor-pointer"
                    onClick={(e) => {
                      // On mobile, only click if clicking directly on the card (not on buttons)
                      const target = e.target as HTMLElement;
                      if (target.closest('button')) {
                        return; // Let button handle its own click
                      }
                      // On desktop (md+), allow card click
                      if (window.matchMedia('(min-width: 768px)').matches) {
                        handleOrderClick(order);
                      }
                    }}
                  >
                    <div className="px-1 py-1">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          {order.first_item_image && (
                            <img 
                              src={order.first_item_image} 
                              alt="Product" 
                              className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0" 
                              onError={(e) => (e.target as HTMLImageElement).src = '/placeholder-product.jpg'} 
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-0.5">
                              <button 
                                className="text-blue-600 hover:text-blue-900 font-medium text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOrderClick(order);
                                }}
                              >
                                #{order.order_number}
                              </button>
                              <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">•</span>
                              <span className="text-xs sm:text-sm text-gray-600 truncate">{userDisplayId}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 font-medium">{formatDate(order.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-end">
                          <Badge
                            className="px-1 py-0 text-[10px] whitespace-nowrap capitalize"
                            variant={
                              order.status === 'delivered'
                                ? 'secondary'
                                : order.status === 'shipped'
                                ? 'secondary'
                                : order.status === 'processing'
                                ? 'secondary'
                                : order.status === 'pending'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {order.status}
                          </Badge>
                          <span className="font-semibold text-xs whitespace-nowrap">{formatCurrency(order.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <OrderDetailsModal
          open={showOrderDetails && !!selectedOrder}
          onClose={() => setShowOrderDetails(false)}
          order={selectedOrder}
          orderItems={orderItems}
          userName={userName}
          userPhone={userPhone}
          userAddress={userAddress}
          onUpdateStatus={handleUpdateOrderStatus}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      </div>
    </AdminLayout>
  );
}
