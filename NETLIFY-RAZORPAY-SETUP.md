# Setting Up Razorpay on Netlify

Your Razorpay integration is working locally, but you need to configure the environment variables in Netlify for production.

## Step 1: Add Environment Variables in Netlify

1. **Go to your Netlify Dashboard**
   - Visit https://app.netlify.com
   - Select your site (apperal)

2. **Navigate to Site Settings**
   - Click on your site
   - Go to **Site configuration** → **Environment variables**

3. **Add the following environment variables:**

   Click **Add variable** and add these three variables:

   ```
   Variable name: RAZORPAY_KEY_ID
   Value: rzp_live_RdNliYLm2FWe00
   ```

   ```
   Variable name: RAZORPAY_KEY_SECRET
   Value: Xr497YVBUnU0JFoGMwuogg1m
   ```

   ```
   Variable name: NEXT_PUBLIC_RAZORPAY_KEY_ID
   Value: rzp_live_RdNliYLm2FWe00
   ```

4. **Save the variables**

5. **Redeploy your site**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
   - Or push a new commit to trigger automatic deployment

## Step 2: Verify the Setup

After redeployment:

1. Visit your production site: https://apperal.netlify.app
2. Try making a test payment
3. The Razorpay payment gateway should now work

## Important Notes

- **Never commit** your `.env.local` file to git (it's already in `.gitignore`)
- **Keep your keys secure** - these are LIVE keys, so they process real payments
- **Test in production** with small amounts first
- If you need to change keys, update them in Netlify and redeploy

## Troubleshooting

If you still see "Payment gateway not configured" after adding variables:

1. **Check variable names** - They must match exactly (case-sensitive)
2. **Redeploy** - Environment variables only take effect after redeployment
3. **Check build logs** - Look for any errors during build
4. **Verify in Netlify** - Go to Site settings → Environment variables to confirm they're saved

## Security Reminder

- These are LIVE Razorpay keys - they process real transactions
- Keep them secure and never share them publicly
- If keys are compromised, regenerate them in Razorpay dashboard immediately

