-- Add Electronics and Mobile Covers categories
-- This script adds the new categories to support the home page sections

-- Insert Electronics category
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES (
  'electronics',
  'Electronics',
  'electronics',
  'Latest gadgets and electronic devices',
  '/images/categories/electronics.jpg',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert Mobile Covers category
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES (
  'mobile-covers',
  'Mobile Covers',
  'mobile-covers',
  'Protect your phone with our stylish covers',
  '/images/categories/mobile-covers.jpg',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add subcategories for Electronics
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES 
  (
    'smartphones',
    'Smartphones',
    'smartphones',
    'Latest smartphones and mobile devices',
    '/images/categories/smartphones.jpg',
    'electronics',
    NOW(),
    NOW()
  ),
  (
    'laptops',
    'Laptops',
    'laptops',
    'High-performance laptops and notebooks',
    '/images/categories/laptops.jpg',
    'electronics',
    NOW(),
    NOW()
  ),
  (
    'headphones',
    'Headphones',
    'headphones',
    'Audio devices and headphones',
    '/images/categories/headphones.jpg',
    'electronics',
    NOW(),
    NOW()
  ),
  (
    'accessories-electronics',
    'Electronics Accessories',
    'accessories-electronics',
    'Chargers, cables, and electronic accessories',
    '/images/categories/electronics-accessories.jpg',
    'electronics',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Add subcategories for Mobile Covers
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES 
  (
    'iphone-covers',
    'iPhone Covers',
    'iphone-covers',
    'Protective covers for iPhone models',
    '/images/categories/iphone-covers.jpg',
    'mobile-covers',
    NOW(),
    NOW()
  ),
  (
    'samsung-covers',
    'Samsung Covers',
    'samsung-covers',
    'Protective covers for Samsung Galaxy models',
    '/images/categories/samsung-covers.jpg',
    'mobile-covers',
    NOW(),
    NOW()
  ),
  (
    'universal-covers',
    'Universal Covers',
    'universal-covers',
    'Universal phone covers for various models',
    '/images/categories/universal-covers.jpg',
    'mobile-covers',
    NOW(),
    NOW()
  ),
  (
    'premium-covers',
    'Premium Covers',
    'premium-covers',
    'High-end luxury phone covers',
    '/images/categories/premium-covers.jpg',
    'mobile-covers',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
