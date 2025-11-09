import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerAuthClient } from '@/lib/supabase/server-auth';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createServerAuthClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      orderNumber,
      orderItems,
      orderData
    } = body;

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
    
    console.log('Creating order after payment verification:', orderNumber);
    console.log('User ID:', user.id);
    
    // Store payment ID in notes field
    const paymentNote = `Payment ID: ${razorpay_payment_id}. Razorpay Order: ${razorpay_order_id}`;
    
    // Create order with paid status
    const { data: createdOrder, error: createError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        payment_method: 'razorpay',
        total_amount: orderData.total,
        status: 'paid',
        payment_status: 'completed',
        notes: paymentNote,
        // Store customer information
        customer_name: orderData.formData.fullName || null,
        customer_phone: orderData.formData.phone || null,
        customer_email: orderData.formData.email || null,
        shipping_address: orderData.formData.address || null,
        shipping_city: orderData.formData.city || null,
        shipping_state: orderData.formData.state || null,
        shipping_zip_code: orderData.formData.zipCode || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating order:', createError);
      console.error('Create data attempted:', {
        order_number: orderNumber,
        user_id: user.id,
        total_amount: orderData.total,
      });
      console.error('Error code:', createError.code);
      console.error('Error message:', createError.message);
      console.error('Error details:', createError.details);
      console.error('Error hint:', createError.hint);
      
      return NextResponse.json(
        { 
          error: 'Failed to create order after payment',
          details: process.env.NODE_ENV === 'development' ? {
            message: createError.message,
            code: createError.code,
            details: createError.details,
            hint: createError.hint,
          } : undefined,
        },
        { status: 500 }
      );
    }

    if (!createdOrder || !createdOrder.id) {
      return NextResponse.json(
        { error: 'Order creation failed' },
        { status: 500 }
      );
    }

    // Create order items
    const orderItemsToInsert = orderItems.map((item: any) => ({
      order_id: createdOrder.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_price: item.product_price,
      total_price: item.total_price,
      quantity: item.quantity,
      size: item.size || null,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Try to delete the order if items creation fails
      await supabaseAdmin.from('orders').delete().eq('id', createdOrder.id);
      
      return NextResponse.json(
        { 
          error: 'Failed to create order items',
          details: process.env.NODE_ENV === 'development' ? {
            message: itemsError.message,
          } : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: createdOrder,
      message: 'Payment verified and order created successfully',
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

