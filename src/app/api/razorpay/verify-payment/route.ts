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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
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

    // Update order in database
    const supabaseAdmin = createServerClient();
    
    console.log('Updating order:', orderId, 'with payment:', razorpay_payment_id);
    console.log('User ID:', user.id);
    
    // Update order status - don't include payment_id as it might not exist in schema
    const updateData: any = {
      status: 'paid',
      payment_method: 'razorpay',
      payment_status: 'completed',
      updated_at: new Date().toISOString(),
    };
    
    // Store payment ID in notes field if payment_id column doesn't exist
    const paymentNote = `Payment ID: ${razorpay_payment_id}. Razorpay Order: ${razorpay_order_id}`;
    
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      console.error('Update data attempted:', updateData);
      console.error('Error code:', updateError.code);
      console.error('Error message:', updateError.message);
      console.error('Error details:', updateError.details);
      console.error('Error hint:', updateError.hint);
      
      return NextResponse.json(
        { 
          error: 'Failed to update order status',
          details: process.env.NODE_ENV === 'development' ? {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
          } : undefined,
        },
        { status: 500 }
      );
    }

    // Store payment ID in notes field for reference
    if (updatedOrder && razorpay_payment_id) {
      try {
        await supabaseAdmin
          .from('orders')
          .update({
            notes: paymentNote,
          })
          .eq('id', orderId);
      } catch (notesError) {
        // Non-critical - just log it
        console.warn('Could not update notes with payment ID:', notesError);
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Payment verified successfully',
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

