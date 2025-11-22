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
  requested_quantity: number;
  reason: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  cancelled_quantity: number | null;
  product_price: number;
}

interface Order {
  id: string;
  status: string;
  user_id: string;
  created_at: string;
}

interface ReturnRequest {
  id: string;
  order_id: string;
  order_item_id: string;
  user_id: string;
  reason: string;
  status: string;
  requested_quantity: number;
  approved_quantity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
    const { order_item_id, requested_quantity, reason } = body;

    // Validate input
    if (!order_item_id || !requested_quantity || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_item_id, requested_quantity, reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (requested_quantity <= 0 || !Number.isInteger(requested_quantity)) {
      return new Response(
        JSON.stringify({ error: 'requested_quantity must be a positive integer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (reason.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Reason cannot be empty' }),
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
      .select('id, status, user_id, created_at')
      .eq('id', (orderItem as OrderItem).order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderData = order as Order;

    // Security check: Verify order belongs to user
    if (orderData.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Order does not belong to user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate order status - only allow returns for delivered orders
    if (orderData.status !== 'delivered') {
      return new Response(
        JSON.stringify({ error: 'Returns can only be requested for delivered orders' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate available quantity (not cancelled, not already returned)
    const itemData = orderItem as OrderItem;
    const totalQuantity = itemData.quantity || 0;
    const cancelledQuantity = itemData.cancelled_quantity || 0;
    const activeQuantity = totalQuantity - cancelledQuantity;

    // Check for existing return requests for this item
    const { data: existingReturns, error: returnsError } = await supabase
      .from('order_returns')
      .select('requested_quantity, status')
      .eq('order_item_id', order_item_id)
      .in('status', ['pending', 'approved']);

    if (returnsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to check existing return requests', details: returnsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const alreadyRequestedQuantity = (existingReturns || []).reduce((sum: number, ret: any) => {
      if (ret.status === 'approved') {
        return sum + (ret.requested_quantity || 0);
      } else if (ret.status === 'pending') {
        return sum + (ret.requested_quantity || 0);
      }
      return sum;
    }, 0);

    const availableForReturn = activeQuantity - alreadyRequestedQuantity;

    // Validate requested quantity
    if (requested_quantity > availableForReturn) {
      return new Response(
        JSON.stringify({ 
          error: `Cannot request return for ${requested_quantity} items. Only ${availableForReturn} items available for return.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if there's already a pending request for this exact item
    const { data: pendingReturn, error: pendingError } = await supabase
      .from('order_returns')
      .select('id')
      .eq('order_item_id', order_item_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingError) {
      return new Response(
        JSON.stringify({ error: 'Failed to check pending returns', details: pendingError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (pendingReturn) {
      return new Response(
        JSON.stringify({ error: 'A pending return request already exists for this item' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optional: Check return window (e.g., 7 days from delivery)
    // This can be configured via environment variable
    // @ts-ignore: Deno global is available in Supabase Edge Functions runtime
    const returnWindowDays = parseInt(Deno.env.get('RETURN_WINDOW_DAYS') || '7', 10);
    const orderDate = new Date(orderData.created_at);
    const daysSinceOrder = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceOrder > returnWindowDays) {
      return new Response(
        JSON.stringify({ 
          error: `Return requests must be made within ${returnWindowDays} days of delivery` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create return request
    const { data: newReturn, error: createError } = await supabase
      .from('order_returns')
      .insert({
        order_id: orderData.id,
        order_item_id: order_item_id,
        user_id: user.id,
        reason: reason.trim(),
        status: 'pending',
        requested_quantity: requested_quantity,
        approved_quantity: null,
      })
      .select()
      .single();

    if (createError || !newReturn) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create return request', 
          details: createError?.message || 'Return creation failed' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        return_request: newReturn as ReturnRequest,
        message: 'Return request submitted successfully'
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

