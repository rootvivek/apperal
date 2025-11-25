'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mobileTypography, mobileTypographyStyles } from '@/utils/mobileTypography';

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
          <Spinner className="size-12 text-blue-600" />
          <p className="mt-4 text-gray-600">Verifying payment...</p>
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
    if (method === 'cod') return 'Cash on Delivery';
    if (method === 'razorpay') return 'UPI Payment';
    return 'Online Payment';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto w-full p-2.5 sm:p-6 pt-4 pb-[50px]">
        <div className="flex flex-col items-center space-y-3 sm:space-y-5">
          <div className="flex flex-col items-center space-y-[10px]">
            <div className="flex-shrink-0">
              <img
                src="/check-icon.svg"
                alt="Order Placed Successfully"
                className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] object-contain"
              />
            </div>
            <h1 className={`${mobileTypography.h2} sm:text-[28px] sm:font-medium text-black sm:leading-[32px] sm:tracking-[-0.24px]`} style={{ ...mobileTypographyStyles.h2, fontFamily: 'Geist, sans-serif' }}>
              Order Placed Successfully!
            </h1>
            <p className={`${mobileTypography.title14} sm:text-[18px] text-black sm:leading-[28px] text-center max-w-[872px]`} style={{ ...mobileTypographyStyles.title14, fontFamily: 'Geist, sans-serif' }}>
              Thank you for your order. We&apos;ve received your order and will begin processing it right away.
            </p>
          </div>

          {order && orderItems.length > 0 && (
            <div className="w-full max-w-[600px] mx-auto space-y-2 sm:space-y-3">
              {/* Order Items Card */}
              <Card className="rounded-[4px]">
                <CardContent className="p-2.5 sm:p-5">
                  <div className="flex flex-col gap-2 sm:gap-4">
                    <h2 className="text-sm sm:text-[24px] font-medium text-black sm:leading-[32px] sm:tracking-[-0.21px]" style={{ fontFamily: 'Geist, sans-serif' }}>
                      Order items
                    </h2>
                    <div className="space-y-[14px] sm:space-y-[18px]">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex items-start gap-2 sm:gap-[14px]">
                          <div className="w-[56px] h-[56px] sm:w-[96px] sm:h-[96px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
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
                              <h3
                                className="text-[14px] font-medium text-black flex-1"
                                style={{ fontFamily: 'Geist, sans-serif', fontSize: '14px', lineHeight: '1.5', fontWeight: '500' }}
                              >
                                {item.product_name}
                              </h3>
                              <span
                                className="text-[14px] font-medium text-black whitespace-nowrap"
                                style={{ fontFamily: 'Geist, sans-serif', fontSize: '14px', lineHeight: '1.5', fontWeight: '500' }}
                              >
                                Price : ₹{item.total_price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Details Card */}
              <Card className="rounded-[4px]">
                <CardContent className="p-2.5 sm:p-5">
                  <div className="flex flex-col gap-2 sm:gap-4">
                    <h2 className="text-sm sm:text-[24px] font-medium text-black sm:leading-[32px] sm:tracking-[-0.21px]" style={{ fontFamily: 'Geist, sans-serif' }}>
                      Order Details
                    </h2>
                    <div className="space-y-1 sm:space-y-[6px]">
                      <div className="flex justify-between items-center gap-[10px]">
                        <span
                          className={`${mobileTypography.body12Medium} text-xs sm:text-sm text-black`}
                          style={{ ...mobileTypographyStyles.body12Medium, fontFamily: 'Geist, sans-serif' }}
                        >
                          Order Number :
                        </span>
                        <span
                          className={`${mobileTypography.body12} text-xs sm:text-sm text-black`}
                          style={{ ...mobileTypographyStyles.body12, fontFamily: 'Geist, sans-serif' }}
                        >
                          {order.order_number}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-[10px]">
                        <span
                          className={`${mobileTypography.body12Medium} text-xs sm:text-sm text-black`}
                          style={{ ...mobileTypographyStyles.body12Medium, fontFamily: 'Geist, sans-serif' }}
                        >
                          Date :
                        </span>
                        <span
                          className={`${mobileTypography.body12} text-xs sm:text-sm text-black text-right`}
                          style={{ ...mobileTypographyStyles.body12, fontFamily: 'Geist, sans-serif' }}
                        >
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-[10px]">
                        <span
                          className={`${mobileTypography.body12Medium} text-xs sm:text-sm text-black`}
                          style={{ ...mobileTypographyStyles.body12Medium, fontFamily: 'Geist, sans-serif' }}
                        >
                          Payment Method :
                        </span>
                        <span
                          className={`${mobileTypography.body12} text-xs sm:text-sm text-black text-right`}
                          style={{ ...mobileTypographyStyles.body12, fontFamily: 'Geist, sans-serif' }}
                        >
                          {getPaymentMethodLabel(order.payment_method)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-[10px]">
                        <span
                          className={`${mobileTypography.body12Medium} text-xs sm:text-sm text-black`}
                          style={{ ...mobileTypographyStyles.body12Medium, fontFamily: 'Geist, sans-serif' }}
                        >
                          Status :
                        </span>
                        <span
                          className={`${mobileTypography.body12} text-xs sm:text-sm text-black text-right capitalize`}
                          style={{ ...mobileTypographyStyles.body12, fontFamily: 'Geist, sans-serif' }}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="w-full max-w-[600px] mx-auto space-y-2 sm:space-y-3">
            <Button asChild className="w-full h-10 sm:h-12">
              <Link href="/">
                Continue Shopping
              </Link>
            </Button>
            {order && (
              <Button asChild variant="outline" className="w-full h-10 sm:h-12">
                <Link href={`/orders/${order.id}`}>
                  View Order
                </Link>
              </Button>
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
        <div className="text-center">
          <Spinner className="size-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying payment...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
