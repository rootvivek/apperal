# Razorpay Payment Integration Setup Guide

This guide will help you set up Razorpay payment gateway integration for your Apperal application.

## Prerequisites

1. A Razorpay account (Sign up at https://razorpay.com/)
2. Your Razorpay API keys (Key ID and Key Secret)

## Step 1: Get Your Razorpay API Keys

1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Generate a new API key pair or use existing ones
4. Copy your **Key ID** and **Key Secret**

**Note:** 
- Use **Test Mode** keys for development
- Use **Live Mode** keys for production

## Step 2: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id
```

**Important:**
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are used server-side (never expose these)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` is used client-side for the Razorpay checkout widget

## Step 3: Install Dependencies

The Razorpay SDK has already been installed. If you need to reinstall:

```bash
npm install razorpay
```

## Step 4: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the checkout page
3. Select "Razorpay" as the payment method
4. Fill in the shipping details
5. Click "Pay with Razorpay"
6. Use Razorpay test credentials to complete the payment

## Test Credentials

For testing in Razorpay test mode, you can use:

**Test Cards:**
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Test UPI IDs:**
- `success@razorpay`
- `failure@razorpay`

## How It Works

1. **Order Creation**: When a user selects Razorpay and submits the checkout form, an order is created in your database with status "pending"

2. **Razorpay Order**: The system creates a Razorpay order via `/api/razorpay/create-order`

3. **Payment Widget**: Razorpay checkout widget opens, allowing the user to pay via:
   - Credit/Debit Cards
   - UPI
   - Wallets (Paytm, PhonePe, etc.)
   - Net Banking
   - Other payment methods

4. **Payment Verification**: After successful payment, the system verifies the payment signature via `/api/razorpay/verify-payment`

5. **Order Update**: The order status is updated to "paid" in your database

6. **Success Redirect**: User is redirected to the success page

## API Routes

### `/api/razorpay/create-order`
- **Method**: POST
- **Purpose**: Creates a Razorpay order for payment
- **Request Body**:
  ```json
  {
    "amount": 1000.00,
    "currency": "INR",
    "orderId": "order-uuid"
  }
  ```

### `/api/razorpay/verify-payment`
- **Method**: POST
- **Purpose**: Verifies payment signature and updates order status
- **Request Body**:
  ```json
  {
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "signature_xxx",
    "orderId": "order-uuid"
  }
  ```

## Security Notes

1. **Never expose** `RAZORPAY_KEY_SECRET` in client-side code
2. Always verify payment signatures on the server
3. Use HTTPS in production
4. Validate all payment data before processing

## Troubleshooting

### Payment widget not loading
- Check if `NEXT_PUBLIC_RAZORPAY_KEY_ID` is set correctly
- Verify the Razorpay script is loading (check browser console)

### Payment verification fails
- Ensure `RAZORPAY_KEY_SECRET` matches the key used to create the order
- Check that you're using the same key pair (test/live) for both order creation and verification

### Order not updating after payment
- Check server logs for errors
- Verify database connection
- Ensure the order ID matches between payment and verification

## Production Checklist

- [ ] Switch to Live Mode API keys
- [ ] Update environment variables in production
- [ ] Test with real payment methods
- [ ] Set up webhook handlers (optional but recommended)
- [ ] Configure payment success/failure redirect URLs in Razorpay dashboard
- [ ] Enable payment notifications

## Support

For Razorpay-specific issues, refer to:
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Support](https://razorpay.com/support/)

