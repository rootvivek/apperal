-- Add pricing and badge fields to products table
-- This script adds support for original price, discount percentage, and product badges

-- Add new columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge VARCHAR(20) DEFAULT NULL;

-- Add check constraint to ensure discount_percentage is between 0 and 100
ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS check_discount_percentage 
CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- Add check constraint to ensure original_price is greater than price when discount is applied
ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS check_price_logic 
CHECK (
  (original_price IS NULL) OR 
  (original_price IS NOT NULL AND original_price >= price)
);

-- Create index on badge for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_badge ON products(badge);

-- Create index on discount_percentage for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_discount ON products(discount_percentage);

-- Update existing products to have original_price = price if not set
UPDATE products 
SET original_price = price 
WHERE original_price IS NULL;

-- Add some sample badges for testing
UPDATE products 
SET badge = CASE 
  WHEN created_at > NOW() - INTERVAL '7 days' THEN 'NEW'
  WHEN RANDOM() < 0.3 THEN 'SALE'
  WHEN RANDOM() < 0.1 THEN 'HOT'
  ELSE NULL
END
WHERE badge IS NULL;

-- Add some sample discounts for testing
UPDATE products 
SET 
  discount_percentage = CASE 
    WHEN RANDOM() < 0.2 THEN FLOOR(RANDOM() * 30 + 10) -- 10-40% discount
    ELSE 0
  END,
  original_price = CASE 
    WHEN RANDOM() < 0.2 THEN price * (1 + (RANDOM() * 0.4 + 0.1)) -- 10-50% markup
    ELSE price
  END
WHERE discount_percentage = 0;

-- Update price to reflect discounted amount where discount is applied
UPDATE products 
SET price = ROUND(original_price * (1 - discount_percentage / 100.0), 2)
WHERE discount_percentage > 0 AND original_price IS NOT NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN products.original_price IS 'Original price before any discount';
COMMENT ON COLUMN products.discount_percentage IS 'Discount percentage (0-100)';
COMMENT ON COLUMN products.badge IS 'Product badge (NEW, SALE, HOT, FEATURED, LIMITED, etc.)';

-- Create a view for products with pricing information
CREATE OR REPLACE VIEW products_with_pricing AS
SELECT 
  p.*,
  CASE 
    WHEN p.discount_percentage > 0 THEN p.original_price - p.price
    ELSE 0
  END as savings_amount,
  CASE 
    WHEN p.discount_percentage > 0 THEN true
    ELSE false
  END as has_discount
FROM products p;

-- Grant permissions if needed
-- GRANT SELECT ON products_with_pricing TO your_app_user;
