# Enhanced ProductCard Database Integration Guide

## 🎯 Overview
This guide explains how to integrate the enhanced ProductCard features with your Supabase database. The ProductCard now supports:
- **Discount pricing** with percentage badges
- **"Newly Added" badges** for recent products
- **Auto-cycling images** on hover
- **Real-time stock status**

## 📋 Database Changes Required

### 1. Run the Database Update Script
Execute the `enhanced-product-card-database-update.sql` script in your Supabase SQL editor:

```sql
-- This script will:
-- ✅ Add is_new field to products table
-- ✅ Add sample products with discounts
-- ✅ Add multiple images for cycling
-- ✅ Create helper functions
-- ✅ Set up proper indexes
```

### 2. Database Schema Updates

#### Products Table Changes:
```sql
-- Added fields:
ALTER TABLE products ADD COLUMN is_new BOOLEAN DEFAULT false;
ALTER TABLE products ADD CONSTRAINT check_original_price_greater_than_price 
CHECK (original_price IS NULL OR original_price >= price);
```

#### New Helper Function:
```sql
-- Discount calculation function
CREATE FUNCTION calculate_discount_percentage(original_price DECIMAL, current_price DECIMAL)
RETURNS INTEGER AS $$
BEGIN
  IF original_price IS NULL OR original_price <= current_price THEN
    RETURN 0;
  END IF;
  RETURN ROUND(((original_price - current_price) / original_price) * 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

## 🔄 Frontend Integration

### 1. Updated ProductCard Interface
The ProductCard now expects this data structure:

```typescript
interface ProductCardProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;        // For discount calculation
  category_name?: string;        // Category display name
  category_slug?: string;        // Category URL slug
  image_url: string;             // Main product image
  stock_quantity: number;
  is_new?: boolean;              // Shows "NEW" badge
  created_at: string;
  updated_at: string;
  images?: {                     // Multiple images for cycling
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
}
```

### 2. Sample Data Query
Use this query to fetch products with all enhanced features:

```sql
SELECT 
  p.id,
  p.name,
  p.description,
  p.price,
  p.original_price,
  p.stock_quantity,
  p.is_new,
  p.created_at,
  c.name as category_name,
  c.slug as category_slug,
  -- Main image
  (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY display_order LIMIT 1) as image_url,
  -- All images for cycling
  COALESCE(
    json_agg(
      json_build_object(
        'id', pi.id,
        'image_url', pi.image_url,
        'alt_text', pi.alt_text,
        'display_order', pi.display_order
      ) ORDER BY pi.display_order
    ) FILTER (WHERE pi.id IS NOT NULL),
    '[]'::json
  ) as images
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN product_images pi ON p.id = pi.product_id
WHERE p.stock_quantity > 0
GROUP BY p.id, c.name, c.slug
ORDER BY p.created_at DESC;
```

## 🎨 Features in Action

### 1. Discount Pricing
- **Original Price**: ₹4,999.00 (strikethrough)
- **Current Price**: ₹2,999.00 (bold)
- **Badge**: "40% OFF" (red background)

### 2. New Product Badge
- Shows green "NEW" badge for products with `is_new = true`
- Automatically shows for products created in last 7 days

### 3. Image Cycling
- Hover over product card to start auto-cycling
- Images change every 2 seconds
- Only works with multiple product images

### 4. Smart Badge Positioning
- Discount badge: Top-left corner
- New badge: Top-right corner
- Wishlist button: Automatically adjusts position

## 📊 Sample Data Included

The database update script includes sample products:

### Electronics:
- **Premium Wireless Headphones**: ₹2,999 (was ₹4,999) - 40% OFF
- **Smart Watch Series 5**: ₹8,999 (was ₹12,999) - 31% OFF + NEW
- **Bluetooth Speaker**: ₹1,999 (was ₹2,999) - 33% OFF

### Clothing:
- **Designer T-Shirt**: ₹799 (was ₹1,299) - 38% OFF + NEW
- **Denim Jeans**: ₹1,499 (was ₹1,999) - 25% OFF
- **Summer Dress**: ₹1,299 (was ₹1,799) - 28% OFF + NEW

### Accessories:
- **Leather Wallet**: ₹599 (was ₹899) - 33% OFF
- **Sunglasses**: ₹899 (was ₹1,299) - 31% OFF + NEW

## 🚀 Implementation Steps

### Step 1: Database Setup
1. Run `enhanced-product-card-database-update.sql` in Supabase
2. Verify the new fields and sample data

### Step 2: Frontend Integration
1. Update your product fetching queries to use the new structure
2. The ProductCard component is already updated and ready to use

### Step 3: Testing
1. Check that discount badges appear correctly
2. Verify "NEW" badges show for new products
3. Test image cycling on hover
4. Confirm price display with strikethrough

## 🔧 Customization Options

### Badge Colors
```css
/* Discount badge */
.discount-badge { background-color: #ef4444; } /* Red */

/* New badge */
.new-badge { background-color: #10b981; } /* Green */
```

### Cycling Speed
```typescript
// In ProductCard component, change the interval:
setInterval(() => {
  // Image cycling logic
}, 2000); // Change 2000ms to desired interval
```

### Discount Threshold
```sql
-- Only show discount badge if discount is >= 10%
WHERE calculate_discount_percentage(original_price, price) >= 10
```

## 📈 Analytics Queries

### Discount Statistics
```sql
SELECT 
  COUNT(*) as total_products,
  COUNT(original_price) as products_with_discounts,
  AVG(calculate_discount_percentage(original_price, price)) as avg_discount
FROM products 
WHERE original_price IS NOT NULL AND original_price > price;
```

### New Products Count
```sql
SELECT COUNT(*) as new_products_count
FROM products 
WHERE is_new = true OR created_at >= CURRENT_DATE - INTERVAL '7 days';
```

## ✅ Verification Checklist

- [ ] Database update script executed successfully
- [ ] `is_new` field added to products table
- [ ] Sample products with discounts created
- [ ] Multiple images added for cycling
- [ ] ProductCard component updated
- [ ] Discount badges displaying correctly
- [ ] "NEW" badges showing for new products
- [ ] Image cycling working on hover
- [ ] Price display with strikethrough working
- [ ] Stock status displaying correctly

## 🎯 Next Steps

1. **Add more sample data** with various discount percentages
2. **Implement product filtering** by discount percentage
3. **Add product sorting** by newest, highest discount, etc.
4. **Create admin interface** to manage discounts and new flags
5. **Add analytics dashboard** for discount performance

The enhanced ProductCard is now fully integrated with your database and ready to provide a rich, interactive shopping experience!
