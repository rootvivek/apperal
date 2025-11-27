'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import EmptyState from '@/components/checkout/shared/EmptyState';
import { mobileTypography } from '@/utils/mobileTypography';
import { useOrderDetail } from '@/hooks/orders/useOrderDetail';
import OrderItem from './OrderItem';
import CancelItemModal from './CancelItemModal';
import ReturnRequestModal from './ReturnRequestModal';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { OrderStatusStepper } from './OrderStatusStepper';
import ImageWithFallback from '@/components/ImageWithFallback';
import ProductCard from '@/components/ProductCard';
import { PRODUCT_GRID_CLASSES_SMALL_GAP } from '@/utils/layoutUtils';
import { createClient } from '@/lib/supabase/client';
import ShippingAddressCard from '@/components/address/ShippingAddressCard';
import OrderSummary from './OrderSummary';
import { Check, CreditCard, Wallet, Building2, MapPin, Phone, Package } from 'lucide-react';
export interface OrderReturn {
  id: string;
  order_id: string;
  order_item_id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled';
  requested_quantity: number;
  approved_quantity: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderDetailItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  product_price: number;
  quantity: number;
  total_price: number;
  size?: string | null;
  is_cancelled?: boolean;
  cancelled_quantity?: number;
  return_requests?: OrderReturn[];
  returned_quantity?: number;
}

export interface OrderDetailData {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status?: string;
  total_amount: number;
  created_at: string;
  items: OrderDetailItem[];
}

interface OrderDetailProps {
  order: OrderDetailData;
  loading?: boolean;
  showCustomerInfo?: boolean;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: {
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state: string;
    zip_code: string;
    full_name?: string | null;
    phone?: number | null;
  } | null;
  onOrderUpdate?: (updatedOrder: OrderDetailData) => void;
}

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
    case 'paid':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function OrderDetail({ 
  order, 
  loading = false,
  showCustomerInfo = false,
  customerName,
  customerPhone,
  shippingAddress,
  onOrderUpdate
}: OrderDetailProps) {
  const {
    currentOrder,
    cancelModal,
    returnModal,
    canCancelItem,
    canReturnItem,
    getReturnStatus,
    handleCancelItem,
    handleRequestReturn,
    closeCancelModal,
    closeReturnModal,
    updateReturnModal,
    confirmCancelItem,
    submitReturnRequest,
  } = useOrderDetail({ order, onOrderUpdate });

  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const supabase = createClient();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Spinner className="size-12 text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  const getSubtotal = () => {
    return currentOrder.items.reduce((total: number, item: OrderDetailItem) => total + item.total_price, 0);
  };

  const getShipping = () => {
    const subtotal = getSubtotal();
    return currentOrder.total_amount - subtotal;
  };

  const primaryItem = currentOrder.items[0];

  const buildFallbackRelated = () => {
    const unique = new Map<string, any>();
    currentOrder.items.forEach((item: OrderDetailItem) => {
      if (!unique.has(item.product_id)) {
        unique.set(item.product_id, {
          id: item.product_id,
          name: item.product_name,
          slug: undefined,
          description: '',
          price: item.product_price,
          original_price: undefined,
          badge: undefined,
          category: '',
          subcategories: [],
          image_url: item.product_image || '/placeholder-product.jpg',
          stock_quantity: 0,
          is_active: true,
          created_at: currentOrder.created_at,
          updated_at: currentOrder.created_at,
          images: [],
        });
      }
    });
    return Array.from(unique.values());
  };

  useEffect(() => {
    const fetchRelated = async () => {
      if (!primaryItem?.product_id) {
        setRelatedProducts(buildFallbackRelated());
        return;
      }

      try {
        // Fetch base product to get category / subcategory
        const { data: baseProduct } = await supabase
          .from('products')
          .select(
            'id, category_id, subcategory_id, name'
          )
          .eq('id', primaryItem.product_id)
          .maybeSingle();

        if (!baseProduct) {
          setRelatedProducts(buildFallbackRelated());
          return;
        }

        const categoryId = baseProduct.category_id as string | null;
        const subcategoryId = baseProduct.subcategory_id as string | null;
        const currentProductId = baseProduct.id as string;

        let productsData: any[] = [];

        // 1) Try same category
        if (categoryId) {
          const { data, error } = await supabase
            .from('products')
            .select(
              'id, name, slug, description, price, original_price, image_url, stock_quantity, is_active, category, subcategory, created_at, updated_at, badge, product_images (id, image_url, alt_text, display_order)'
            )
            .eq('category_id', categoryId)
            .neq('id', currentProductId)
            .eq('is_active', true)
            .limit(8)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            productsData = data;
          }
        }

        // 2) Fallback: same subcategory
        if (productsData.length === 0 && subcategoryId) {
          const { data, error } = await supabase
            .from('products')
            .select(
              'id, name, slug, description, price, original_price, image_url, stock_quantity, is_active, category, subcategory, created_at, updated_at, badge, product_images (id, image_url, alt_text, display_order)'
            )
            .eq('subcategory_id', subcategoryId)
            .neq('id', currentProductId)
            .eq('is_active', true)
            .limit(8)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            productsData = data;
          }
        }

        // 3) Final fallback: any active products
        if (productsData.length === 0) {
          const { data, error } = await supabase
            .from('products')
            .select(
              'id, name, slug, description, price, original_price, image_url, stock_quantity, is_active, category, subcategory, created_at, updated_at, badge, product_images (id, image_url, alt_text, display_order)'
            )
            .neq('id', currentProductId)
            .eq('is_active', true)
            .limit(8)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            productsData = data;
          }
        }

        if (!productsData || productsData.length === 0) {
          setRelatedProducts(buildFallbackRelated());
          return;
        }

        // Transform products similarly to product detail page
        const transformed = productsData.map((product: any) => {
          let mainImageUrl = product.image_url;
          if (!mainImageUrl && product.product_images && product.product_images.length > 0) {
            mainImageUrl = product.product_images[0].image_url;
          }

          const imagesArray =
            product.product_images && product.product_images.length > 0
              ? product.product_images.map((img: any) => ({
                  id: img.id || 'image-' + Math.random(),
                  image_url: img.image_url,
                  alt_text: img.alt_text || product.name,
                  display_order: img.display_order || 0,
                }))
              : mainImageUrl
              ? [
                  {
                    id: 'main-image',
                    image_url: mainImageUrl,
                    alt_text: product.name,
                    display_order: 0,
                  },
                ]
              : [];

        return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: product.price,
            original_price: product.original_price ?? undefined,
            badge: product.badge ?? undefined,
            category: typeof product.category === 'object' ? product.category?.name || '' : product.category || '',
            subcategories: product.subcategory ? [product.subcategory] : [],
            image_url: mainImageUrl || '/placeholder-product.jpg',
            stock_quantity: product.stock_quantity ?? 0,
            is_active: product.is_active ?? true,
            created_at: product.created_at,
            updated_at: product.updated_at,
            images: imagesArray,
          };
        });

        setRelatedProducts(transformed);
      } catch (err) {
        setRelatedProducts(buildFallbackRelated());
      }
    };

    fetchRelated();
  }, [primaryItem?.product_id, supabase, currentOrder.items, currentOrder.created_at]);

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Order Status and Order Items in one row */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Order Status Card with Timeline - First */}
        <Card className="rounded-2xl">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col gap-1 mb-3 sm:mb-4 lg:mb-6">
              <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
                Order Status
              </h2>
              {currentOrder.order_number && (
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">
                  Order ID: {currentOrder.order_number}
                </p>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3 sm:left-4 top-4 sm:top-6 bottom-4 sm:bottom-6 w-0.5 bg-gray-200" />
              <div className="space-y-4 sm:space-y-6">
                <div className="flex gap-3 sm:gap-4 relative">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center z-10 flex-shrink-0">
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="flex-1 pb-4 sm:pb-6">
                    <p className="mb-0.5 sm:mb-1 text-xs sm:text-sm font-medium">Order Placed</p>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600">
                      {new Date(currentOrder.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 relative">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0 ${
                    ['processing', 'shipped', 'delivered'].includes(currentOrder.status) 
                      ? 'bg-green-500' 
                      : 'bg-gray-200 border-2 border-gray-300'
                  }`}>
                    {['processing', 'shipped', 'delivered'].includes(currentOrder.status) && (
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 pb-4 sm:pb-6">
                    <p className={`mb-0.5 sm:mb-1 text-xs sm:text-sm ${['processing', 'shipped', 'delivered'].includes(currentOrder.status) ? 'font-medium' : 'text-gray-500'}`}>
                      Processing
                    </p>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600">Preparing your order</p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 relative">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0 ${
                    ['shipped', 'delivered'].includes(currentOrder.status) 
                      ? 'bg-green-500' 
                      : 'bg-gray-200 border-2 border-gray-300'
                  }`}>
                    {['shipped', 'delivered'].includes(currentOrder.status) && (
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 pb-4 sm:pb-6">
                    <p className={`mb-0.5 sm:mb-1 text-xs sm:text-sm ${['shipped', 'delivered'].includes(currentOrder.status) ? 'font-medium' : 'text-gray-500'}`}>
                      Shipped
                    </p>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600">On the way to you</p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 relative">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0 ${
                    currentOrder.status === 'delivered' 
                      ? 'bg-green-500' 
                      : 'bg-gray-200 border-2 border-gray-300'
                  }`}>
                    {currentOrder.status === 'delivered' && (
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`mb-0.5 sm:mb-1 text-xs sm:text-sm ${currentOrder.status === 'delivered' ? 'font-medium' : 'text-gray-500'}`}>
                      Delivered
                    </p>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600">
                      {currentOrder.status === 'delivered' 
                        ? formatDate(currentOrder.created_at)
                        : `Est. ${new Date(new Date(currentOrder.created_at).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items & Shipping Address Card - Second */}
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            {/* Order Items Section */}
            <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                Order Items
              </h3>
              {currentOrder.items.length === 0 ? (
                <div className="py-4 sm:py-6">
                  <EmptyState title="No items found" variant="minimal" />
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {currentOrder.items.map((item: OrderDetailItem, index: number) => (
                    <div key={item.id} className="flex gap-3 sm:gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                        <ImageWithFallback
                          src={item.product_image || '/placeholder-product.jpg'}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                          fallbackType="product"
                          loading="lazy"
                          decoding="async"
                          width={80}
                          height={80}
                          responsive
                          responsiveSizes={[80, 160]}
                          quality={85}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="mb-1 text-sm sm:text-base font-medium">{item.product_name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm sm:text-base font-medium">{formatCurrency(item.total_price)}</p>
                        <p className="text-xs sm:text-sm text-gray-600">{formatCurrency(item.product_price)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shipping Address Section */}
            {showCustomerInfo && (customerName || customerPhone || shippingAddress) && (
              <div className="p-3 sm:p-4 lg:p-6">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                  Shipping Address
                </h3>
                <div className="space-y-1 text-xs sm:text-sm">
                  <p className="font-medium">{customerName || shippingAddress?.full_name}</p>
                  <p className="text-gray-600">{shippingAddress?.address_line1}</p>
                  <p className="text-gray-600">
                    {shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.zip_code}
                  </p>
                  {(customerPhone || shippingAddress?.phone) && (
                    <p className="text-gray-600 mt-2 sm:mt-3 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      {customerPhone || shippingAddress?.phone}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Method & Summary Card */}
      <Card className="rounded-2xl">
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                Payment Method
              </h3>
              <div className="space-y-2 text-xs sm:text-sm">
                {currentOrder.payment_method === 'upi' && (
                  <div className="flex items-center gap-2 bg-gray-50 p-2 sm:p-3 rounded-lg">
                    <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <p>UPI</p>
                  </div>
                )}
                {currentOrder.payment_method === 'cod' && (
                  <div className="flex items-center gap-2 bg-gray-50 p-2 sm:p-3 rounded-lg">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <p>Cash on Delivery</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4">Payment Summary</h3>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(getSubtotal())}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className={getShipping() === 0 ? 'text-green-500' : ''}>
                    {getShipping() === 0 ? 'FREE' : formatCurrency(getShipping())}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>{formatCurrency(getSubtotal() * 0.1)}</span>
                </div>
                <div className="flex justify-between pt-2 sm:pt-3 border-t border-gray-200">
                  <span className="font-medium">Total Paid</span>
                  <span className="text-base sm:text-lg font-semibold text-primary">
                    {formatCurrency(currentOrder.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Products Card */}
      {relatedProducts.length > 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="text-center mb-2 sm:mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                Related Products
              </h3>
            </div>
            <div className={PRODUCT_GRID_CLASSES_SMALL_GAP}>
              {relatedProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  variant="minimal"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Cancel Item Modal */}
      <CancelItemModal
        isOpen={cancelModal.modalOpen}
        selectedItem={cancelModal.selectedItem}
        orderNumber={currentOrder.order_number}
        loading={cancelModal.isCancelling}
        onConfirm={confirmCancelItem}
        onClose={closeCancelModal}
      />

      {/* Return Request Modal */}
      {returnModal.selectedItem && (() => {
        const remainingQuantity = returnModal.selectedItem!.quantity - (returnModal.selectedItem!.cancelled_quantity || 0);
        const returnStatus = getReturnStatus(returnModal.selectedItem);
        const availableForReturn = remainingQuantity - returnStatus.returnedQuantity;
        
        return (
          <ReturnRequestModal
            isOpen={returnModal.modalOpen}
            selectedItem={returnModal.selectedItem}
            quantity={returnModal.quantity}
            reason={returnModal.reason}
            maxQuantity={availableForReturn}
            loading={returnModal.isSubmitting}
            onQuantityChange={(qty) => updateReturnModal({ quantity: qty })}
            onReasonChange={(reason) => updateReturnModal({ reason })}
            onConfirm={submitReturnRequest}
            onClose={closeReturnModal}
          />
        );
      })()}
    </div>
  );
}

