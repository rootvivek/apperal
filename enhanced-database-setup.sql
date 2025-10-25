-- Enhanced Database Setup with Clothing Categories and Classic Cotton T-Shirt
-- Run this in your Supabase SQL Editor

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create categories table (if not exists)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create products table (if not exists)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  brand VARCHAR(100),
  category_id UUID REFERENCES categories(id),
  subcategory VARCHAR(100),
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_new BOOLEAN DEFAULT false,
  show_in_hero BOOLEAN DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create product_images table (if not exists)
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Insert main categories
INSERT INTO categories (name, slug, description, image_url) VALUES
('Electronics', 'electronics', 'Electronic devices and gadgets', '/images/categories/electronics.jpg'),
('Accessories', 'accessories', 'Fashion accessories and items', '/images/categories/accessories.jpg'),
('Men''s Clothing', 'mens-clothing', 'Clothing for men', '/images/categories/mens-clothing.jpg'),
('Women''s Clothing', 'womens-clothing', 'Clothing for women', '/images/categories/womens-clothing.jpg'),
('Kids Clothing', 'kids-clothing', 'Clothing for children', '/images/categories/kids-clothing.jpg')
ON CONFLICT (slug) DO NOTHING;

-- 6. Insert subcategories for Men's Clothing
INSERT INTO categories (name, slug, description, parent_category_id) VALUES
('T-Shirts', 'mens-tshirts', 'Men''s t-shirts and tops', (SELECT id FROM categories WHERE slug = 'mens-clothing')),
('Jeans', 'mens-jeans', 'Men''s jeans and pants', (SELECT id FROM categories WHERE slug = 'mens-clothing')),
('Shirts', 'mens-shirts', 'Men''s dress shirts', (SELECT id FROM categories WHERE slug = 'mens-clothing')),
('Jackets', 'mens-jackets', 'Men''s jackets and coats', (SELECT id FROM categories WHERE slug = 'mens-clothing'))
ON CONFLICT (slug) DO NOTHING;

-- 7. Insert sample products including Classic Cotton T-Shirt
INSERT INTO products (name, slug, description, price, original_price, category_id, subcategory, stock_quantity, is_active, is_new, image_url) VALUES
-- Electronics
('Premium Wireless Headphones', 'premium-wireless-headphones', 'High-quality wireless headphones with noise cancellation', 2999.00, 3999.00, (SELECT id FROM categories WHERE slug = 'electronics'), 'Audio', 15, true, true, '/images/products/headphones-1.jpg'),
('Smart Watch Series 5', 'smart-watch-series-5', 'Advanced smartwatch with health monitoring', 8999.00, 11999.00, (SELECT id FROM categories WHERE slug = 'electronics'), 'Wearables', 8, true, true, '/images/products/smartwatch-1.jpg'),
('Bluetooth Speaker', 'bluetooth-speaker', 'Portable Bluetooth speaker with great sound quality', 1999.00, 2499.00, (SELECT id FROM categories WHERE slug = 'electronics'), 'Audio', 12, true, false, '/images/products/speaker-1.jpg'),

-- Accessories
('Designer Sunglasses', 'designer-sunglasses', 'Stylish sunglasses with UV protection', 1299.00, 1599.00, (SELECT id FROM categories WHERE slug = 'accessories'), 'Eyewear', 20, true, false, '/images/products/sunglasses-1.jpg'),
('Leather Wallet', 'leather-wallet', 'Premium leather wallet with RFID protection', 899.00, 1199.00, (SELECT id FROM categories WHERE slug = 'accessories'), 'Bags & Wallets', 25, true, true, '/images/products/wallet-1.jpg'),

-- Men's Clothing - THE CLASSIC COTTON T-SHIRT
('Classic Cotton T-Shirt', 'classic-cotton-tshirt', 'Comfortable 100% cotton t-shirt in classic fit', 599.00, 799.00, (SELECT id FROM categories WHERE slug = 'mens-clothing'), 'T-Shirts', 50, true, true, '/images/products/tshirt-1.jpg'),
('Denim Jeans', 'denim-jeans', 'Classic blue denim jeans with comfortable fit', 1299.00, 1599.00, (SELECT id FROM categories WHERE slug = 'mens-clothing'), 'Jeans', 30, true, false, '/images/products/jeans-1.jpg'),
('Dress Shirt', 'dress-shirt', 'Formal white dress shirt for business occasions', 899.00, 1099.00, (SELECT id FROM categories WHERE slug = 'mens-clothing'), 'Shirts', 20, true, false, '/images/products/shirt-1.jpg'),

-- Women's Clothing
('Floral Summer Dress', 'floral-summer-dress', 'Light and breezy floral dress perfect for summer', 1299.00, 1599.00, (SELECT id FROM categories WHERE slug = 'womens-clothing'), 'Dresses', 15, true, true, '/images/products/dress-1.jpg'),
('Women''s Blouse', 'womens-blouse', 'Elegant blouse for office or casual wear', 799.00, 999.00, (SELECT id FROM categories WHERE slug = 'womens-clothing'), 'Tops', 25, true, false, '/images/products/blouse-1.jpg')
ON CONFLICT (slug) DO NOTHING;

-- 8. Insert product images for Classic Cotton T-Shirt
INSERT INTO product_images (product_id, image_url, alt_text, display_order) VALUES
((SELECT id FROM products WHERE slug = 'classic-cotton-tshirt'), '/images/products/tshirt-1.jpg', 'Classic Cotton T-Shirt Front View', 1),
((SELECT id FROM products WHERE slug = 'classic-cotton-tshirt'), '/images/products/tshirt-2.jpg', 'Classic Cotton T-Shirt Side View', 2),
((SELECT id FROM products WHERE slug = 'classic-cotton-tshirt'), '/images/products/tshirt-3.jpg', 'Classic Cotton T-Shirt Back View', 3)
ON CONFLICT DO NOTHING;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON product_images(display_order);

-- 10. Verify the setup
SELECT 'Setup completed successfully!' as status;
SELECT COUNT(*) as total_categories FROM categories;
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_images FROM product_images;
SELECT name, slug FROM products WHERE name LIKE '%Classic Cotton T-Shirt%';
