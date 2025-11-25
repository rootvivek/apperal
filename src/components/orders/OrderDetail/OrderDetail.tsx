'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import EmptyState from '@/components/EmptyState';
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
    <div className="space-y-3 sm:space-y-4">
      {/* Mobile hero product card (matches Figma top section) */}
      {primaryItem && (
        <div className="lg:hidden flex flex-col items-center gap-2 bg-white rounded-[4px] p-4">
          <div className="w-[118px] h-[120px] rounded-[4px] overflow-hidden">
            <ImageWithFallback
              src={primaryItem.product_image || '/placeholder-product.jpg'}
              alt={primaryItem.product_name}
              className="w-full h-full object-cover"
              fallbackType="product"
              loading="lazy"
              decoding="async"
              width={118}
              height={120}
              responsive
              responsiveSizes={[118, 236]}
              quality={85}
            />
          </div>
          <p className="text-sm font-medium text-gray-900 text-center max-w-[220px] line-clamp-2">
            {primaryItem.product_name}
          </p>
        </div>
      )}

      {/* Order Status Card */}
      <Card className="rounded-[4px]">
        <CardContent className="p-2.5">
          <div className="flex flex-col gap-1.5 mb-2 sm:mb-3">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900">
              Order #{currentOrder.order_number}
            </h2>
            <p className={`${mobileTypography.body12} sm:text-sm text-gray-600`}>
              {formatDate(currentOrder.created_at)}
            </p>
          </div>
          <OrderStatusStepper status={currentOrder.status} />
        </CardContent>
      </Card>

      {/* Shipping Information Card */}
      {showCustomerInfo && (customerName || customerPhone || shippingAddress) && (
        <ShippingAddressCard
          address={{
            id: 'order-shipping',
            full_name: customerName || shippingAddress?.full_name || undefined,
            phone: customerPhone ? parseInt(String(customerPhone), 10) : (shippingAddress?.phone || undefined),
            address_line1: shippingAddress?.address_line1 || '',
            address_line2: shippingAddress?.address_line2,
            city: shippingAddress?.city || '',
            state: shippingAddress?.state || '',
            zip_code: shippingAddress?.zip_code || '',
            is_default: false,
          }}
          variant="display"
          compact={true}
          showPhone={!!(customerPhone || shippingAddress?.phone)}
        />
      )}

      {/* Related Products Card */}
      {relatedProducts.length > 0 && (
        <Card className="rounded-[4px]">
          <CardContent className="p-2.5">
            <div className="text-center mb-3">
              <h3 className={`${mobileTypography.title14Bold} sm:text-base text-gray-900`}>
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

      {/* Order Items Card (desktop only – hidden on mobile to match Figma card) */}
      <div className="hidden lg:block">
        <Card className="rounded-[4px]">
          <CardContent className="p-2.5">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1">
              Order Items
            </h3>
            <p className="text-xs text-gray-600 mb-3 sm:mb-4">
              {currentOrder.items.length} item(s) in this order
            </p>

            {currentOrder.items.length === 0 ? (
              <div className="py-6">
                <EmptyState title="No items found" variant="minimal" />
              </div>
            ) : (
              <div className="space-y-0">
                {currentOrder.items.map((item: OrderDetailItem, index: number) => (
                  <div key={item.id}>
                    {index > 0 && (
                      <div className="my-3 sm:my-4">
                        <div className="border-t border-gray-200" />
                      </div>
                    )}
                    <OrderItem
                      item={item}
                      canCancel={canCancelItem(item)}
                      canReturn={canReturnItem(item)}
                      returnStatus={getReturnStatus(item)}
                      onCancel={handleCancelItem}
                      onRequestReturn={handleRequestReturn}
                      formatCurrency={formatCurrency}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

