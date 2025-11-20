import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DirectPurchaseParams {
  direct: string | null;
  productId: string | null;
  quantity: string | null;
  size: string | null;
}

export function useDirectPurchase() {
  const [items, setItems] = useState<any[]>([]);
  const [isDirectPurchase, setIsDirectPurchase] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);
  const supabase = createClient();

  const getUrlParams = (): DirectPurchaseParams => {
    if (typeof window === 'undefined') {
      return { direct: null, productId: null, quantity: null, size: null };
    }
    try {
      const params = new URLSearchParams(window.location.search);
      return {
        direct: params.get('direct'),
        productId: params.get('productId'),
        quantity: params.get('quantity'),
        size: params.get('size'),
      };
    } catch {
      return { direct: null, productId: null, quantity: null, size: null };
    }
  };

  const fetchProduct = async (productId: string, quantity: string, size: string | null) => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    setLoading(true);

    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, price, image_url, stock_quantity, subcategory_id')
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (error || !product) {
        setLoading(false);
        return;
      }

      const directItem = {
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          stock_quantity: product.stock_quantity,
        },
        quantity: parseInt(quantity),
        size: size || null,
      };

      setItems([directItem]);
      setIsDirectPurchase(true);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = getUrlParams();
    if (params.direct === 'true' && params.productId && params.quantity && !hasFetched.current) {
      fetchProduct(params.productId, params.quantity, params.size);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return { items, isDirectPurchase, loading };
}

