# Supabase Setup Guide for Apperal E-Commerce

## 🚀 Quick Start

This guide will help you set up Supabase for your Apperal e-commerce application.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in your project details:
   - **Name**: Apperal
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be provisioned (1-2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under Project API)
   - **anon/public** key (under Project API keys)
   - **service_role** key (optional, for server-side operations)

## Step 3: Configure Environment Variables

1. In your project root, create a file named `.env.local`
2. Add the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

3. Replace the placeholder values with your actual Supabase credentials
4. **Important**: Never commit `.env.local` to version control!

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire content from `supabase-schema.sql` file in your project root
4. Paste it into the SQL editor
5. Click "Run" to execute the schema
6. Verify that all tables were created successfully

### Tables Created:
- ✅ `categories` - Product categories and subcategories
- ✅ `products` - Product information
- ✅ `product_images` - Product image URLs
- ✅ `product_variants` - Size/color variants
- ✅ `profiles` - User profiles (auto-created on signup)
- ✅ `addresses` - User shipping/billing addresses
- ✅ `carts` - Shopping carts
- ✅ `cart_items` - Cart contents
- ✅ `orders` - Order information
- ✅ `order_items` - Order line items
- ✅ `wishlists` - User wishlists
- ✅ `reviews` - Product reviews

## Step 5: Configure Authentication

### Enable Email Authentication:
1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize confirmation and password reset emails

### Enable Social Authentication (Optional):

#### Google OAuth:
1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Get credentials from [Google Cloud Console](https://console.cloud.google.com):
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
4. Enter Client ID and Client Secret in Supabase

#### Facebook OAuth:
1. Go to **Authentication** → **Providers**
2. Enable **Facebook**
3. Get credentials from [Facebook Developers](https://developers.facebook.com):
   - Create a new app
   - Add Facebook Login product
   - Add OAuth redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
4. Enter App ID and App Secret in Supabase

## Step 6: Seed Sample Data (Optional)

### Add Sample Categories:
```sql
INSERT INTO categories (name, slug, description, image_url) VALUES
('Men''s Clothing', 'mens-clothing', 'Stylish and comfortable clothing for men', '/images/categories/mens-clothing.jpg'),
('Women''s Clothing', 'womens-clothing', 'Fashionable and elegant clothing for women', '/images/categories/womens-clothing.jpg'),
('Accessories', 'accessories', 'Complete your look with our accessories', '/images/categories/accessories.jpg'),
('Kids'' Clothing', 'kids-clothing', 'Fun and comfortable clothing for kids', '/images/categories/kids-clothing.jpg');
```

### Add Sample Products:
```sql
INSERT INTO products (name, slug, description, price, original_price, category_id, brand, in_stock, stock_quantity, rating, review_count)
SELECT 
  'Classic Cotton T-Shirt',
  'mens-cotton-tshirt-001',
  'Comfortable 100% cotton t-shirt perfect for everyday wear',
  29.99,
  39.99,
  id,
  'Apperal',
  true,
  100,
  4.5,
  128
FROM categories WHERE slug = 'mens-clothing';
```

## Step 7: Test Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/signup`
3. Create a test account
4. Check your email for verification (if enabled)
5. Try logging in at `http://localhost:3000/login`
6. Test social login (if configured)

## Step 8: Verify Database Setup

1. Go to **Database** → **Tables** in Supabase
2. Verify all tables are created
3. Check **Authentication** → **Users** to see registered users
4. Test inserting data through the app

## 🔒 Security Best Practices

1. **Row Level Security (RLS)**: Already enabled in the schema
2. **Never expose service_role key** in client-side code
3. **Use environment variables** for all sensitive data
4. **Enable email verification** in production
5. **Set up rate limiting** in Supabase dashboard

## 📊 Using Supabase with Your App

### Fetching Products:
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Fetch all products
const { data: products, error } = await supabase
  .from('products')
  .select('*, product_images(*), categories(*)')
  .eq('in_stock', true)

// Fetch products by category
const { data: categoryProducts, error } = await supabase
  .from('products')
  .select('*')
  .eq('category_id', categoryId)
```

### Managing Cart:
```typescript
// Add item to cart
const { data, error } = await supabase
  .from('cart_items')
  .insert({
    cart_id: userCart.id,
    product_id: productId,
    variant_id: variantId,
    quantity: 1
  })

// Get user's cart
const { data: cartItems, error } = await supabase
  .from('cart_items')
  .select('*, products(*), product_variants(*)')
  .eq('cart_id', userCart.id)
```

### Creating Orders:
```typescript
const { data: order, error } = await supabase
  .from('orders')
  .insert({
    user_id: user.id,
    order_number: generateOrderNumber(),
    status: 'pending',
    subtotal: calculateSubtotal(),
    total: calculateTotal()
  })
  .select()
  .single()
```

## 🔧 Troubleshooting

### "Failed to fetch" errors:
- Check your `.env.local` file has correct values
- Restart your development server after adding env variables
- Verify Supabase project is not paused

### Authentication not working:
- Check email provider settings in Supabase
- Verify redirect URLs are configured correctly
- Check browser console for detailed error messages

### Database queries failing:
- Verify RLS policies allow the operation
- Check user is authenticated for protected queries
- Review Supabase logs in dashboard

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🎉 You're Ready!

Your Apperal e-commerce application is now fully integrated with Supabase for:
- ✅ User authentication (email + social)
- ✅ Product management
- ✅ Shopping cart functionality
- ✅ Order processing
- ✅ User profiles and addresses
- ✅ Wishlists and reviews

Happy coding! 🚀
