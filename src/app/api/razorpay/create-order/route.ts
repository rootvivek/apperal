import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

// Initialize Razorpay only if keys are available
let razorpay: Razorpay | null = null;

try {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (keyId && keySecret) {
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
} catch (error) {
  // Error initializing Razorpay
}

export async function POST(request: NextRequest) {
  try {
    // Check if Razorpay is initialized
    if (!razorpay) {
      return NextResponse.json(
        { 
          error: 'Payment gateway not configured. Please contact support.',
          details: process.env.NODE_ENV === 'development' ? {
            message: 'Razorpay environment variables are missing. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.',
          } : undefined,
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { amount, currency = 'INR', userId } = body;

    // Verify user is authenticated (user ID from request body)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      );
    }

    // Verify user exists in user_profiles (optional check)
    // For now, we'll trust the client-side auth and just use the userId
    const user = { id: userId };

    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Convert amount to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    if (amountInPaise < 100) {
      return NextResponse.json(
        { error: 'Minimum order amount is ₹1.00' },
        { status: 400 }
      );
    }

    // Create a shorter receipt ID (Razorpay receipt max 40 chars, alphanumeric only)
    // Use timestamp for uniqueness
    const shortReceipt = `ord_${Date.now().toString().slice(-10)}`.substring(0, 40);

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: currency,
      receipt: shortReceipt,
      notes: {
        user_id: user.id,
      },
    });

    const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    
    if (!publicKey) {
      return NextResponse.json(
        { error: 'Payment gateway configuration error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: publicKey,
    });
  } catch (error: any) {
    // Provide more specific error messages
    let errorMessage = 'Failed to create payment order';
    
    if (error.statusCode === 401 || error.statusCode === 403) {
      errorMessage = 'Invalid Razorpay API keys. Please check your configuration.';
    } else if (error.statusCode === 400) {
      // Razorpay 400 errors usually have a description or field error
      if (error.description) {
        errorMessage = error.description;
      } else if (error.error && error.error.description) {
        errorMessage = error.error.description;
      } else if (error.field) {
        errorMessage = `Invalid ${error.field}: ${error.description || error.message}`;
      } else {
        errorMessage = error.message || 'Invalid request to payment gateway. Please check your order details.';
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          statusCode: error.statusCode,
          field: error.field,
          description: error.description,
        } : undefined,
      },
      { status: error.statusCode || 500 }
    );
  }
}

