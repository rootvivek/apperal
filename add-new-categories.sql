-- Add new categories including Featured Products
-- This script adds new categories to the existing categories table

-- Insert Featured Products category
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES (
  'featured-products',
  'Featured Products',
  'featured-products',
  'Handpicked bestsellers and trending items',
  '/images/categories/featured-products.jpg',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert New Arrivals category
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES (
  'new-arrivals',
  'New Arrivals',
  'new-arrivals',
  'Latest additions to our collection',
  '/images/categories/new-arrivals.jpg',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert Sale category
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES (
  'sale',
  'Sale',
  'sale',
  'Special offers and discounted items',
  '/images/categories/sale.jpg',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert Best Sellers category
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES (
  'best-sellers',
  'Best Sellers',
  'best-sellers',
  'Our most popular and highly rated products',
  '/images/categories/best-sellers.jpg',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert Seasonal category
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES (
  'seasonal',
  'Seasonal',
  'seasonal',
  'Season-specific clothing and accessories',
  '/images/categories/seasonal.jpg',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert Premium category
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES (
  'premium',
  'Premium',
  'premium',
  'High-end luxury items and exclusive collections',
  '/images/categories/premium.jpg',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add subcategories for Featured Products
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES 
  (
    'featured-mens',
    'Featured Men\'s Items',
    'featured-mens',
    'Top-rated men\'s clothing and accessories',
    '/images/categories/featured-mens.jpg',
    'featured-products',
    NOW(),
    NOW()
  ),
  (
    'featured-womens',
    'Featured Women\'s Items',
    'featured-womens',
    'Top-rated women\'s clothing and accessories',
    '/images/categories/featured-womens.jpg',
    'featured-products',
    NOW(),
    NOW()
  ),
  (
    'featured-accessories',
    'Featured Accessories',
    'featured-accessories',
    'Must-have accessories and jewelry',
    '/images/categories/featured-accessories.jpg',
    'featured-products',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Add subcategories for Sale
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES 
  (
    'sale-mens',
    'Men\'s Sale',
    'sale-mens',
    'Discounted men\'s clothing',
    '/images/categories/sale-mens.jpg',
    'sale',
    NOW(),
    NOW()
  ),
  (
    'sale-womens',
    'Women\'s Sale',
    'sale-womens',
    'Discounted women\'s clothing',
    '/images/categories/sale-womens.jpg',
    'sale',
    NOW(),
    NOW()
  ),
  (
    'sale-accessories',
    'Accessories Sale',
    'sale-accessories',
    'Discounted accessories and jewelry',
    '/images/categories/sale-accessories.jpg',
    'sale',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Add subcategories for Seasonal
INSERT INTO categories (id, name, slug, description, image_url, parent_category_id, created_at, updated_at)
VALUES 
  (
    'spring-collection',
    'Spring Collection',
    'spring-collection',
    'Fresh spring styles and colors',
    '/images/categories/spring-collection.jpg',
    'seasonal',
    NOW(),
    NOW()
  ),
  (
    'summer-collection',
    'Summer Collection',
    'summer-collection',
    'Light and breezy summer essentials',
    '/images/categories/summer-collection.jpg',
    'seasonal',
    NOW(),
    NOW()
  ),
  (
    'fall-collection',
    'Fall Collection',
    'fall-collection',
    'Cozy fall and autumn styles',
    '/images/categories/fall-collection.jpg',
    'seasonal',
    NOW(),
    NOW()
  ),
  (
    'winter-collection',
    'Winter Collection',
    'winter-collection',
    'Warm winter clothing and accessories',
    '/images/categories/winter-collection.jpg',
    'seasonal',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
