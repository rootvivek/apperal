'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LoadingLogo from '@/components/LoadingLogo';

interface OrderItem {
  id: string;
  product_name: string;
  total_price: number;
  product_image?: string;
}

interface Order {
  id: string;
  order_number: string;
  payment_method: string;
  status: string;
  created_at: string;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      const orderId = searchParams.get('orderId');
      
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        
        // Fetch order details
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle();
        
        if (orderError) {
          console.error('Error fetching order:', orderError);
          setLoading(false);
          return;
        }

        if (!orderData) {
          console.error('Order not found with ID:', orderId);
          setLoading(false);
          return;
        }
        
        // Fetch order items with product data (JOIN)
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select(`
            *,
            products:product_id (
              name,
              image_url,
              subcategory_id
            )
          `)
          .eq('order_id', orderId) as any;
        
        if (itemsError) {
          console.error('Error fetching order items:', itemsError);
        }
        
        if (itemsData && itemsData.length > 0) {
          const itemsWithImages = itemsData.map((item: any) => {
            const product = item.products || {};
            return {
              id: item.id,
              product_name: product.name || 'Product not found',
              total_price: item.total_price,
              product_image: product.image_url || null
            };
          });
          
          setOrderItems(itemsWithImages);
        } else {
          setOrderItems([]);
        }
        
        setOrder(orderData);
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingLogo size="md" text="Verifying payment..." />
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    return method === 'cod' ? 'Cash on Delivery' : 'Credit/Debit Card';
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1440px] mx-auto w-full px-[10px] sm:px-[100px] py-[50px]">
        <div className="flex flex-col items-center space-y-5">
          <div className="flex flex-col items-center space-y-[10px]">
            <div className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] flex-shrink-0">
              <div className="w-full h-full bg-brand-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 sm:w-12 sm:h-12 text-brand"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-[22px] sm:text-[28px] font-semibold sm:font-medium text-black leading-[32px] tracking-[-0.18px] sm:tracking-[-0.24px]" style={{ fontFamily: 'Geist, sans-serif' }}>
              Order Place Successfully!
            </h1>
            <p className="text-[14px] sm:text-[18px] font-normal text-black leading-[20px] sm:leading-[28px] text-center max-w-[872px]" style={{ fontFamily: 'Geist, sans-serif' }}>
              Thanks you for your order. We&apos;ve received your order and will begin processing it right away.
            </p>
          </div>

          {order && orderItems.length > 0 && (
            <div className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-sm p-[10px] sm:p-5 flex flex-col gap-[22px] sm:gap-[30px]">
              <div className="flex flex-col gap-2 sm:gap-[24px]">
                <h2 className="text-[16px] sm:text-[24px] font-semibold sm:font-medium text-black leading-[24px] sm:leading-[32px] sm:tracking-[-0.21px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Order items
                </h2>
                <div className="space-y-[10px]">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-1.5 sm:gap-[12px]">
                      <div className="w-[64px] h-[64px] sm:w-[120px] sm:h-[120px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-product.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-start space-y-1 sm:space-y-[6px]">
                        <div className="flex justify-between items-start gap-[10px]">
                          <h3 className="text-[14px] sm:text-[18px] font-normal text-black leading-[20px] sm:leading-[28px] flex-1" style={{ fontFamily: 'Geist, sans-serif' }}>
                            {item.product_name}
                          </h3>
                          <span className="text-[14px] sm:text-[18px] font-normal text-black leading-[20px] sm:leading-[28px] whitespace-nowrap" style={{ fontFamily: 'Geist, sans-serif' }}>
                            Price : ₹{item.total_price.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[14px] sm:text-[18px] font-normal text-black leading-[20px] sm:leading-[28px]" style={{ fontFamily: 'Geist, sans-serif' }}>
                          {getPaymentMethodLabel(order?.payment_method || 'cod').toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full h-[1px] bg-[#D9D9D9]"></div>
              <div className="flex flex-col gap-2 sm:gap-[24px]">
                <h2 className="text-[16px] sm:text-[24px] font-semibold sm:font-medium text-black leading-[24px] sm:leading-[32px] sm:tracking-[-0.21px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Order Details
                </h2>
                <div className="space-y-1 sm:space-y-[6px]">
                  <div className="flex justify-between items-center gap-[10px]">
                    <span className="text-[14px] sm:text-[18px] font-medium text-black leading-[20px] sm:leading-[28px]" style={{ fontFamily: 'Geist, sans-serif' }}>Order Number :</span>
                    <span className="text-[14px] sm:text-[18px] font-normal text-black leading-[20px] sm:leading-[28px]" style={{ fontFamily: 'Geist, sans-serif' }}>ORD-ID:{order.order_number}</span>
                  </div>
                  <div className="flex justify-between items-center gap-[10px]">
                    <span className="text-[14px] sm:text-[18px] font-medium text-black leading-[20px] sm:leading-[28px]" style={{ fontFamily: 'Geist, sans-serif' }}>Date :</span>
                    <span className="text-[14px] sm:text-[18px] font-normal text-black leading-[20px] sm:leading-[28px] text-right" style={{ fontFamily: 'Geist, sans-serif' }}>
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-[10px]">
                    <span className="text-[14px] sm:text-[18px] font-medium text-black leading-[20px] sm:leading-[28px]" style={{ fontFamily: 'Geist, sans-serif' }}>Payment Method :</span>
                    <span className="text-[14px] sm:text-[18px] font-normal text-black leading-[20px] sm:leading-[28px] text-right" style={{ fontFamily: 'Geist, sans-serif' }}>
                      {getPaymentMethodLabel(order.payment_method)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-[10px]">
                    <span className="text-[14px] sm:text-[18px] font-medium text-black leading-[20px] sm:leading-[28px]" style={{ fontFamily: 'Geist, sans-serif' }}>Status :</span>
                    <span className="text-[14px] sm:text-[18px] font-normal text-black leading-[20px] sm:leading-[28px] text-right capitalize" style={{ fontFamily: 'Geist, sans-serif' }}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="w-full space-y-[10px] sm:space-y-[20px]">
            <Link
              href="/"
              className="w-full h-[42px] sm:h-[52px] bg-[#0F172A] text-white px-4 py-2 rounded-md font-medium text-[14px] leading-[24px] hover:bg-[#1E293B] transition-colors flex items-center justify-center"
            >
              Continue Shopping
            </Link>
            {order && (
              <Link
                href={`/orders/${order.id}`}
                className="w-full h-[42px] sm:h-[52px] bg-white border border-[#E2E8F0] text-[#0F172A] px-4 py-2 rounded-md font-medium text-[14px] leading-[24px] hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                View Order
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingLogo size="md" text="Verifying payment..." />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
