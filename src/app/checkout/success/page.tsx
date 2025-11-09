'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getProductDetailType } from '@/utils/productDetailsMapping';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total_price: number;
  product_image?: string;
  size?: string | null;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productSubcategories, setProductSubcategories] = useState<{[key: string]: {name: string | null, slug: string | null, detail_type: string | null}}>({});

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
          .single() as any;
        
        if (orderError) {
          console.error('Error fetching order:', orderError);
          setLoading(false);
          return;
        }
        
        // Fetch order items
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId) as any;
        
        if (itemsError) {
          console.error('Error fetching order items:', itemsError);
        }
        
        // Fetch product images and subcategory info for each order item
        if (itemsData && itemsData.length > 0) {
          const subcategoryMap: {[key: string]: {name: string | null, slug: string | null, detail_type: string | null}} = {};
          
          const itemsWithImages = await Promise.all(
            itemsData.map(async (item: any) => {
              if (item.product_id) {
                const { data: productData } = await supabase
                  .from('products')
                  .select('image_url, subcategory_id')
                  .eq('id', item.product_id)
                  .single();
                
                // Fetch subcategory info
                if (productData?.subcategory_id) {
                  const { data: subcategory } = await supabase
                    .from('subcategories')
                    .select('name, slug, detail_type')
                    .eq('id', productData.subcategory_id)
                    .single();
                  
                  if (subcategory) {
                    subcategoryMap[item.product_id] = {
                      name: subcategory.name,
                      slug: subcategory.slug,
                      detail_type: subcategory.detail_type
                    };
                  }
                }
                
                return {
                  ...item,
                  product_image: productData?.image_url || null
                };
              }
              return item;
            })
          );
          
          setProductSubcategories(subcategoryMap);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
              <svg
                className="h-12 w-12 text-green-600"
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
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Order Placed Successfully!
            </h1>
            <p className="text-gray-600">
              Thank you for your order. We&apos;ve received your order and will begin processing it right away.
            </p>
          </div>

          {/* Order Details */}
          {order && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-semibold text-gray-900">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="text-gray-900">{formatDate(order.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="text-gray-900">{getPaymentMethodLabel(order.payment_method)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 capitalize">
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          {orderItems.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex gap-4 items-start">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-20 h-20 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-product.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{item.product_name}</h3>
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity} × ₹{item.product_price.toFixed(2)}
                            {(() => {
                              const subcategoryInfo = productSubcategories[item.product_id];
                              const detailType = subcategoryInfo 
                                ? getProductDetailType(
                                    subcategoryInfo.name,
                                    subcategoryInfo.slug,
                                    subcategoryInfo.detail_type
                                  )
                                : 'none';
                              
                              // Only show size for apparel products
                              if (detailType === 'apparel' && item.size) {
                                return <span className="ml-2">| Size: {item.size}</span>;
                              }
                              return null;
                            })()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 text-lg">
                            ₹{item.total_price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Amount */}
          {order && (
            <div className="border-t border-gray-200 pt-6 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-xl font-semibold text-gray-900">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">
                  ₹{order.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* What's Next */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              What happens next?
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-blue-600 mr-3">✓</span>
                <span className="text-gray-700">You&apos;ll receive an order confirmation email shortly</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-3">✓</span>
                <span className="text-gray-700">We&apos;ll send you tracking information once your order ships</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-3">✓</span>
                <span className="text-gray-700">Your order will be delivered within 3-5 business days</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors text-center"
            >
              Continue Shopping
            </Link>
            <Link
              href="/"
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-md font-medium hover:bg-gray-50 transition-colors text-center"
            >
              Back to Home
            </Link>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
