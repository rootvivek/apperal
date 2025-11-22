// @deno-types - This file runs on Deno, not Node.js
// TypeScript errors for Deno imports are expected in IDE but won't affect runtime
// @ts-ignore - Deno-specific imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore - Deno-specific imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  order_item_id: string;
  cancelled_quantity: number;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  cancelled_quantity: number | null;
  product_price: number;
  size: string | null;
}

interface Order {
  id: string;
  status: string;
  subtotal: number;
  tax: number | null;
  shipping_cost: number | null;
  total_amount: number;
  user_id: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // @ts-ignore - Deno global is available at runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // @ts-ignore - Deno global is available at runtime
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const body: RequestBody = await req.json();
    const { order_item_id, cancelled_quantity } = body;

    // Validate input
    if (!order_item_id || !cancelled_quantity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_item_id, cancelled_quantity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (cancelled_quantity <= 0 || !Number.isInteger(cancelled_quantity)) {
      return new Response(
        JSON.stringify({ error: 'cancelled_quantity must be a positive integer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order item
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', order_item_id)
      .single();

    if (itemError || !orderItem) {
      return new Response(
        JSON.stringify({ error: 'Order item not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch parent order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, subtotal, tax, shipping_cost, total_amount, user_id')
      .eq('id', (orderItem as OrderItem).order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security check: Verify order belongs to user (unless admin)
    const orderData = order as Order;
    if (orderData.user_id !== user.id) {
      // Check if user is admin (optional - adjust based on your admin check logic)
      // For now, we'll only allow users to cancel their own orders
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Order does not belong to user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate order status
    if (orderData.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Cannot cancel items in a cancelled order' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (orderData.status === 'delivered') {
      return new Response(
        JSON.stringify({ error: 'Cannot cancel items in a delivered order' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate remaining quantity
    const itemData = orderItem as OrderItem;
    const currentQuantity = itemData.quantity || 0;
    const alreadyCancelled = itemData.cancelled_quantity || 0;
    const remainingQuantity = currentQuantity - alreadyCancelled;

    // Prevent over-cancellation
    if (cancelled_quantity > remainingQuantity) {
      return new Response(
        JSON.stringify({ 
          error: `Cannot cancel ${cancelled_quantity} items. Only ${remainingQuantity} items remaining.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate new cancelled quantity
    const newCancelledQuantity = alreadyCancelled + cancelled_quantity;
    const activeQuantity = currentQuantity - newCancelledQuantity;

    // Update order item
    const updateData = {
      cancelled_quantity: newCancelledQuantity,
      cancelled_at: new Date().toISOString(),
    };

    const { data: updatedItem, error: updateItemError } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', order_item_id)
      .select()
      .single();

    if (updateItemError || !updatedItem) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to cancel item', 
          details: updateItemError?.message || 'Item update failed' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all order items for recalculation
    const { data: allOrderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('id, product_price, quantity, cancelled_quantity')
      .eq('order_id', orderData.id)
      .order('created_at', { ascending: true });

    if (itemsError) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch order items for recalculation', 
          details: itemsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newSubtotal = (allOrderItems || []).reduce((sum: number, item: any) => {
      const activeQty = (item.quantity || 0) - (item.cancelled_quantity || 0);
      return sum + ((item.product_price || 0) * activeQty);
    }, 0);

    // Recalculate total
    const newTax = orderData.tax || 0;
    const newTotalAmount = newSubtotal + (orderData.shipping_cost || 0) + newTax;

    const allItemsCancelled = (allOrderItems || []).every((item: any) => {
      const activeQty = (item.quantity || 0) - (item.cancelled_quantity || 0);
      return activeQty === 0;
    });

    // Prepare order update
    const orderUpdateData: any = {
      subtotal: newSubtotal,
      tax: newTax,
      total_amount: newTotalAmount,
      updated_at: new Date().toISOString(),
    };

    // Update order status if needed
    if (allItemsCancelled) {
      orderUpdateData.status = 'cancelled';
      orderUpdateData.cancelled_at = new Date().toISOString();
    } else {
      // If order was paid/completed, set to processing
      if (orderData.status === 'paid' || orderData.status === 'completed') {
        orderUpdateData.status = 'processing';
      }
    }

    // Update order
    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from('orders')
      .update(orderUpdateData)
      .eq('id', orderData.id)
      .select()
      .single();

    if (updateOrderError) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update order totals', 
          details: updateOrderError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all order items with product data for response
    const { data: allItemsWithProducts, error: fetchItemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        products:product_id (
          name,
          image_url
        )
      `)
      .eq('order_id', orderData.id)
      .order('created_at', { ascending: true });

    if (fetchItemsError) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch updated order items', 
          details: fetchItemsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map items to response format
    const mappedItems = (allItemsWithProducts || []).map((item: any) => {
      const product = item.products || {};
      const cancelledQty = item.cancelled_quantity || 0;
      const activeQty = item.quantity - cancelledQty;
      
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: product.name || 'Product not found',
        product_image: product.image_url || null,
        product_price: item.product_price,
        quantity: item.quantity,
        total_price: item.product_price * activeQty,
        size: item.size,
        is_cancelled: activeQty === 0,
        cancelled_quantity: cancelledQty,
      };
    });

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        order: updatedOrder,
        order_items: mappedItems,
        all_items_cancelled: allItemsCancelled,
        message: allItemsCancelled 
          ? 'Item cancelled. All items in this order are now cancelled.'
          : 'Item cancelled successfully. Order totals updated.'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

