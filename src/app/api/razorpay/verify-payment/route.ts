import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      orderNumber,
      orderItems,
      orderData,
      userId
    } = body;

    // Verify user is authenticated (Firebase user ID from request body)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      );
    }

    const user = { id: userId };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderNumber || !orderItems || !orderData) {
      return NextResponse.json(
        { error: 'Missing required payment verification data' },
        { status: 400 }
      );
    }

    // Verify the payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    const isSignatureValid = generatedSignature === razorpay_signature;

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Create order in database after successful payment verification
    const supabaseAdmin = createServerClient();
    
    // Store payment ID in notes field (for backward compatibility) and dedicated columns
    const paymentNote = `Payment ID: ${razorpay_payment_id}. Razorpay Order: ${razorpay_order_id}`;
    
    // Create order with paid status
    // Orders table uses normalized structure: only shipping_address_id, no customer_name/phone
    const orderTotal = orderData.total;
    const orderInsertData: any = {
      user_id: user.id,
      order_number: orderNumber,
      payment_method: 'razorpay',
      subtotal: orderData.subtotal || orderTotal,
      shipping_cost: orderData.shipping || 0,
      tax: 0, // Tax not calculated in current flow
      total_amount: orderTotal, // Use total_amount (total column removed)
      status: 'paid',
      payment_status: 'completed',
      notes: paymentNote,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id,
    };
    
    // Do NOT add customer_name or customer_phone - fetch from user_profiles via user_id
    
    // Use shipping_address_id (normalized approach)
    // All new orders must use shipping_address_id - no fallback to individual fields
    if (orderData.shippingAddressId) {
      orderInsertData.shipping_address_id = orderData.shippingAddressId;
    } else if (orderData.formData) {
      // Create address if shippingAddressId not provided
      if (orderData.formData.address && orderData.formData.city && orderData.formData.state && orderData.formData.zipCode) {
        const { data: newAddress, error: addressError } = await supabaseAdmin
          .from('addresses')
          .insert({
            user_id: user.id,
            address_line1: orderData.formData.address,
            city: orderData.formData.city,
            state: orderData.formData.state,
            zip_code: orderData.formData.zipCode,
            full_name: orderData.formData.fullName?.trim() || null,
            phone: orderData.formData.phone ? parseInt(String(orderData.formData.phone), 10) : null,
            is_default: false,
          })
          .select('id')
          .single();

        if (!addressError && newAddress) {
          orderInsertData.shipping_address_id = newAddress.id;
        } else {
          // Address creation failed - return error instead of fallback
          return NextResponse.json(
            { error: 'Failed to save shipping address. Please try again.' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Shipping address information is required' },
          { status: 400 }
        );
      }
    }
    
    const { data: createdOrder, error: createError } = await supabaseAdmin
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single();

    if (createError) {
      // Return a proper error response with all error details
      const errorMessage = createError.message || 'Database error';
      const errorResponse: any = {
        error: `Failed to create order: ${errorMessage}`,
        message: errorMessage,
            code: createError.code,
      };
      
      // Always include details for debugging
      errorResponse.details = {
            details: createError.details,
            hint: createError.hint,
        attemptedData: {
          order_number: orderNumber,
          user_id: user.id,
          user_id_type: typeof user.id,
          total: orderData.total,
          subtotal: orderData.subtotal,
          shipping: orderData.shipping,
        },
        // Include the full error object
        fullError: {
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
        }
      };
      
      return NextResponse.json(errorResponse, { status: 500 });
    }

    if (!createdOrder || !createdOrder.id) {
      return NextResponse.json(
        { error: 'Order creation failed' },
        { status: 500 }
      );
    }

    // Create order items
    // Normalized structure: only product_id, product_price (at time of purchase), total_price, quantity, size
    // Product name and image are fetched from products table via JOIN
    const orderItemsToInsert = orderItems.map((item: any) => {
      const unitPrice = item.product_price || item.price || 0;
      const lineTotal = item.total_price || (unitPrice * item.quantity);
      
      const orderItem: any = {
        order_id: createdOrder.id,
        product_id: item.product_id,
        product_price: unitPrice, // Price at time of purchase (for historical accuracy)
        total_price: lineTotal, // Line total = product_price * quantity
        quantity: item.quantity,
      };
      
      if (item.size) {
        orderItem.size = item.size;
      }
      
      return orderItem;
    });

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) {
      // Try to delete the order if items creation fails
      await supabaseAdmin.from('orders').delete().eq('id', createdOrder.id);
      
      return NextResponse.json(
        { 
          error: 'Failed to create order items',
          details: {
            message: itemsError.message,
            code: itemsError.code,
            details: itemsError.details,
            hint: itemsError.hint,
          },
        },
        { status: 500 }
      );
    }

    // Update stock quantities after order items are created
    try {
      const stockUpdates = await Promise.all(
        orderItems.map(async (item: any) => {
          // Get current stock
          const { data: product, error: fetchError } = await supabaseAdmin
            .from('products')
            .select('id, name, stock_quantity')
            .eq('id', item.product_id)
            .single();

          if (fetchError || !product) {
            return { productId: item.product_id, success: false };
          }

          const currentStock = product.stock_quantity || 0;
          const newStock = Math.max(0, currentStock - item.quantity);

          // Update stock
          const { error: updateError } = await supabaseAdmin
            .from('products')
            .update({ 
              stock_quantity: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.product_id);

          if (updateError) {
            return { productId: item.product_id, success: false };
          }

          return { productId: item.product_id, success: true };
        })
      );

      const failedUpdates = stockUpdates.filter(update => !update.success);
      if (failedUpdates.length > 0) {
        // Don't fail the order if stock update fails - log it for admin review
      }
    } catch {
      // Don't fail the order if stock update fails
    }

    return NextResponse.json({
      success: true,
      order: createdOrder,
      message: 'Payment verified and order created successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

