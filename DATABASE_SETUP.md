# Database Setup for Orders

This guide will help you set up and fix the database structure for the orders system.

## Files

- `fix-orders-database.sql` - Comprehensive SQL script to fix orders table structure
- `check-orders-schema.sql` - Script to check current orders table structure
- `supabase-schema.sql` - Complete database schema

## Quick Start

### 1. Run the Database Fix Script

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy the contents of `fix-orders-database.sql`
4. Paste and click **Run**

This script will:
- ✅ Rename `total` column to `total_amount` (if needed)
- ✅ Add all missing columns to the `orders` table
- ✅ Add all missing columns to the `order_items` table
- ✅ Add `role` and `email` columns to `profiles` table
- ✅ Create proper indexes for better performance
- ✅ Set up Row Level Security (RLS) policies
- ✅ Allow admin users to view all orders
- ✅ Allow users to view their own orders
- ✅ Update existing order numbers if missing

## What Gets Fixed

### Orders Table
```
✅ user_id - User who placed the order
✅ order_number - Unique order identifier
✅ status - Order status (pending, processing, shipped, delivered, cancelled)
✅ payment_method - Payment method used
✅ total_amount - Total amount of the order
✅ subtotal - Subtotal before shipping and tax
✅ shipping_cost - Shipping charges
✅ tax - Tax amount
✅ created_at - Order creation timestamp
```

### Order Items Table
```
✅ order_id - Reference to parent order
✅ product_id - Reference to product
✅ product_name - Product name (snapshot)
✅ product_image - Product image URL (snapshot)
✅ product_price - Price at time of purchase (snapshot)
✅ quantity - Quantity ordered
✅ total_price - Total price for this line item
```

### Profiles Table
```
✅ role - User role (user, admin)
✅ email - User email address
```

## Setting Up Admin User

To set up an admin user:

1. Run this SQL in Supabase SQL Editor:
```sql
-- Update your user to admin role (replace with your user ID)
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'your-user-id-here';

-- Or if you want to use email:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

## Testing

### Check Orders Table Structure
Run this to verify the structure:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
```

### Check RLS Policies
Run this to see current policies:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items', 'profiles');
```

## Troubleshooting

### Issue: "column does not exist"
**Solution:** Run `fix-orders-database.sql` to add all missing columns

### Issue: "permission denied for table orders"
**Solution:** Check that RLS policies are properly set up in the script

### Issue: Admin can't see all orders
**Solution:** Make sure your user has `role = 'admin'` in the profiles table

### Issue: Users can't see their orders
**Solution:** Run the RLS policy updates in the script

## Next Steps

After running the database fix script:

1. ✅ Database structure is ready
2. ✅ User orders page is available at `/orders`
3. ✅ Admin orders page is available at `/admin/orders`
4. ✅ Orders icon appears in navigation for logged-in users

## Support

If you encounter any issues:
1. Check the console for error messages
2. Verify RLS policies are set correctly
3. Make sure your user has the correct role assigned
4. Verify all columns exist using the check script

