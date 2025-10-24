-- =============================================
-- Updated Products Table for Admin CMS
-- =============================================

-- First, let's add the missing columns to the existing products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update the products table to make it more admin-friendly
-- (This will work with existing data)

-- Create a function to generate slugs
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(input_text, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Update existing products to have proper slugs if they don't
UPDATE products 
SET slug = generate_slug(name) 
WHERE slug IS NULL OR slug = '';

-- Add some sample products for testing
INSERT INTO products (
  name, 
  slug, 
  description, 
  price, 
  category, 
  subcategory, 
  image_url, 
  stock_quantity, 
  is_active
) VALUES 
(
  'Classic Cotton T-Shirt',
  'classic-cotton-t-shirt',
  'Comfortable 100% cotton t-shirt perfect for everyday wear. Available in multiple colors.',
  24.99,
  'Men''s Clothing',
  'Tops & T-Shirts',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
  50,
  true
),
(
  'Elegant Summer Dress',
  'elegant-summer-dress',
  'Light and breezy summer dress perfect for warm weather. Features a flattering A-line silhouette.',
  89.99,
  'Women''s Clothing',
  'Dresses',
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
  25,
  true
),
(
  'Leather Crossbody Bag',
  'leather-crossbody-bag',
  'Stylish leather crossbody bag with adjustable strap. Perfect for daily use.',
  79.99,
  'Accessories',
  'Bags & Purses',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  30,
  true
),
(
  'Kids'' Colorful Hoodie',
  'kids-colorful-hoodie',
  'Soft and comfortable hoodie for kids. Features fun colors and a cozy fleece lining.',
  39.99,
  'Kids'' Clothing',
  'Tops',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
  40,
  true
),
(
  'Denim Jacket',
  'denim-jacket',
  'Classic denim jacket with a modern fit. Perfect for layering in any season.',
  69.99,
  'Men''s Clothing',
  'Jackets & Coats',
  'https://images.unsplash.com/photo-1544022613-e87ca75a784f?w=400',
  35,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Create RLS policies for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active products
CREATE POLICY "Public can view active products" ON products
  FOR SELECT USING (is_active = true);

-- Allow authenticated users to manage products (for admin)
CREATE POLICY "Authenticated users can manage products" ON products
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_text ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price_range ON products(price);

-- Create a view for admin product management
CREATE OR REPLACE VIEW admin_products AS
SELECT 
  id,
  name,
  slug,
  description,
  price,
  category,
  subcategory,
  image_url,
  stock_quantity,
  is_active,
  created_at,
  updated_at
FROM products
ORDER BY created_at DESC;

-- Grant access to the view
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_products TO authenticated;

-- =============================================
-- CATEGORIES TABLE SETUP
-- =============================================

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_category_id);

-- Enable RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to categories
CREATE POLICY "Public can view categories" ON categories
  FOR SELECT USING (true);

-- Allow authenticated users to manage categories
CREATE POLICY "Authenticated users can manage categories" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
