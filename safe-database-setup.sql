-- =============================================
-- SAFE DATABASE SETUP (Handles Existing Objects)
-- =============================================
-- This script safely creates database objects without errors

-- 1. Create categories table (if not exists)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create products table (if not exists)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  brand VARCHAR(255),
  category_id UUID REFERENCES categories(id),
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_new BOOLEAN DEFAULT false,
  show_in_hero BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create product_images table (if not exists)
CREATE TABLE IF NOT EXISTS product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes safely (drop first if exists)
DROP INDEX IF EXISTS idx_categories_slug;
CREATE INDEX idx_categories_slug ON categories(slug);

DROP INDEX IF EXISTS idx_products_slug;
CREATE INDEX idx_products_slug ON products(slug);

DROP INDEX IF EXISTS idx_products_category;
CREATE INDEX idx_products_category ON products(category_id);

DROP INDEX IF EXISTS idx_products_hero;
CREATE INDEX idx_products_hero ON products(show_in_hero);

DROP INDEX IF EXISTS idx_product_images_product;
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- 5. Insert sample categories (if not exist)
INSERT INTO categories (name, slug, description) VALUES
('Electronics', 'electronics', 'Electronic devices and gadgets')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, description) VALUES
('Accessories', 'accessories', 'Fashion accessories and items')
ON CONFLICT (slug) DO NOTHING;

-- 6. Insert sample products (if not exist)
INSERT INTO products (name, slug, description, price, original_price, category_id, stock_quantity, is_active, show_in_hero, is_new) 
SELECT 
  'Premium Wireless Headphones',
  'premium-wireless-headphones',
  'High-quality wireless headphones with noise cancellation',
  2999.00,
  3999.00,
  (SELECT id FROM categories WHERE slug = 'electronics'),
  15,
  true,
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'premium-wireless-headphones');

INSERT INTO products (name, slug, description, price, original_price, category_id, stock_quantity, is_active, show_in_hero, is_new) 
SELECT 
  'Smart Watch Series 5',
  'smart-watch-series-5',
  'Advanced smartwatch with health monitoring',
  8999.00,
  11999.00,
  (SELECT id FROM categories WHERE slug = 'electronics'),
  8,
  true,
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'smart-watch-series-5');

INSERT INTO products (name, slug, description, price, original_price, category_id, stock_quantity, is_active, show_in_hero, is_new) 
SELECT 
  'Bluetooth Speaker',
  'bluetooth-speaker',
  'Portable Bluetooth speaker with great sound quality',
  1999.00,
  2499.00,
  (SELECT id FROM categories WHERE slug = 'electronics'),
  12,
  true,
  true,
  false
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'bluetooth-speaker');

INSERT INTO products (name, slug, description, price, original_price, category_id, stock_quantity, is_active, show_in_hero, is_new) 
SELECT 
  'Designer Sunglasses',
  'designer-sunglasses',
  'Stylish sunglasses with UV protection',
  1299.00,
  1599.00,
  (SELECT id FROM categories WHERE slug = 'accessories'),
  20,
  true,
  true,
  false
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'designer-sunglasses');

-- 7. Insert product images (if not exist)
INSERT INTO product_images (product_id, image_url, alt_text, display_order)
SELECT 
  (SELECT id FROM products WHERE slug = 'premium-wireless-headphones'),
  '/images/products/headphones-1.jpg',
  'Premium Wireless Headphones - Main View',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM product_images 
  WHERE product_id = (SELECT id FROM products WHERE slug = 'premium-wireless-headphones')
  AND image_url = '/images/products/headphones-1.jpg'
);

INSERT INTO product_images (product_id, image_url, alt_text, display_order)
SELECT 
  (SELECT id FROM products WHERE slug = 'smart-watch-series-5'),
  '/images/products/smartwatch-1.jpg',
  'Smart Watch Series 5 - Main View',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM product_images 
  WHERE product_id = (SELECT id FROM products WHERE slug = 'smart-watch-series-5')
  AND image_url = '/images/products/smartwatch-1.jpg'
);

INSERT INTO product_images (product_id, image_url, alt_text, display_order)
SELECT 
  (SELECT id FROM products WHERE slug = 'bluetooth-speaker'),
  '/images/products/speaker-1.jpg',
  'Bluetooth Speaker - Main View',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM product_images 
  WHERE product_id = (SELECT id FROM products WHERE slug = 'bluetooth-speaker')
  AND image_url = '/images/products/speaker-1.jpg'
);

INSERT INTO product_images (product_id, image_url, alt_text, display_order)
SELECT 
  (SELECT id FROM products WHERE slug = 'designer-sunglasses'),
  '/images/products/sunglasses-1.jpg',
  'Designer Sunglasses - Main View',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM product_images 
  WHERE product_id = (SELECT id FROM products WHERE slug = 'designer-sunglasses')
  AND image_url = '/images/products/sunglasses-1.jpg'
);

-- 8. Verify the setup
SELECT 'Categories:' as info;
SELECT id, name, slug FROM categories;

SELECT 'Products:' as info;
SELECT id, name, slug, price, show_in_hero FROM products WHERE show_in_hero = true;

SELECT 'Product Images:' as info;
SELECT p.name, pi.image_url FROM products p 
JOIN product_images pi ON p.id = pi.product_id 
WHERE p.show_in_hero = true;
