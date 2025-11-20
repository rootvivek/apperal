import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_item_id, cancelled_quantity } = body;

    if (!order_item_id || !cancelled_quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: order_item_id, cancelled_quantity' },
        { status: 400 }
      );
    }

    if (cancelled_quantity <= 0 || !Number.isInteger(cancelled_quantity)) {
      return NextResponse.json(
        { error: 'cancelled_quantity must be a positive integer' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', order_item_id)
      .single();

    if (itemError || !orderItem) {
      return NextResponse.json(
        { error: 'Order item not found' },
        { status: 404 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, subtotal, tax, shipping_cost, total_amount')
      .eq('id', orderItem.order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot cancel items in a cancelled order' },
        { status: 400 }
      );
    }

    if (order.status === 'delivered') {
      return NextResponse.json(
        { error: 'Cannot cancel items in a delivered order' },
        { status: 400 }
      );
    }

    const currentQuantity = orderItem.quantity || 0;
    const alreadyCancelled = orderItem.cancelled_quantity || 0;
    const remainingQuantity = currentQuantity - alreadyCancelled;

    if (cancelled_quantity > remainingQuantity) {
      return NextResponse.json(
        { error: `Cannot cancel ${cancelled_quantity} items. Only ${remainingQuantity} items remaining.` },
        { status: 400 }
      );
    }

    const newCancelledQuantity = alreadyCancelled + cancelled_quantity;

    const updateData: any = {
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
      return NextResponse.json(
        { error: 'Failed to cancel item', details: updateItemError?.message || 'Item update failed' },
        { status: 500 }
      );
    }

    if (updatedItem.id !== order_item_id) {
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    const { data: allOrderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('id, product_price, quantity, cancelled_quantity')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true });

    if (itemsError) {
      return NextResponse.json(
        { error: 'Failed to fetch order items for recalculation', details: itemsError.message },
        { status: 500 }
      );
    }

    const newSubtotal = (allOrderItems || []).reduce((sum, item) => {
      const activeQty = (item.quantity || 0) - (item.cancelled_quantity || 0);
      return sum + ((item.product_price || 0) * activeQty);
    }, 0);

    const newTax = 0;
    const newTotalAmount = newSubtotal + (order.shipping_cost || 0) + newTax;

    const allItemsCancelled = (allOrderItems || []).every(item => {
      const activeQty = (item.quantity || 0) - (item.cancelled_quantity || 0);
      return activeQty === 0;
    });

    const orderUpdateData: any = {
      subtotal: newSubtotal,
      tax: newTax,
      total_amount: newTotalAmount,
      updated_at: new Date().toISOString(),
    };

    if (allItemsCancelled) {
      orderUpdateData.status = 'cancelled';
      orderUpdateData.cancelled_at = new Date().toISOString();
    } else {
      if (order.status === 'paid' || order.status === 'completed') {
        orderUpdateData.status = 'processing';
      }
    }

    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from('orders')
      .update(orderUpdateData)
      .eq('id', order.id)
      .select()
      .single();

    if (updateOrderError) {
      return NextResponse.json(
        { error: 'Failed to update order totals', details: updateOrderError.message },
        { status: 500 }
      );
    }

    const verifiedUpdatedItem = allOrderItems?.find(item => item.id === order_item_id);
    
    return NextResponse.json({
      success: true,
      order_item: {
        ...orderItem,
        cancelled_quantity: verifiedUpdatedItem?.cancelled_quantity || newCancelledQuantity,
      },
      order: updatedOrder,
      all_items_cancelled: allItemsCancelled,
      message: allItemsCancelled 
        ? 'Item cancelled. All items in this order are now cancelled.'
        : 'Item cancelled successfully. Order totals updated.'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

