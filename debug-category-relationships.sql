-- Check Category-Product Relationships
-- Run this in your Supabase SQL Editor to debug the issue

-- 1. Check all categories
SELECT id, name, slug FROM categories ORDER BY name;

-- 2. Check all products and their category_id
SELECT id, name, category_id FROM products WHERE is_active = true ORDER BY name;

-- 3. Check if there are any products with NULL category_id
SELECT COUNT(*) as products_with_null_category FROM products WHERE category_id IS NULL;

-- 4. Check the relationship between categories and products
SELECT 
  c.name as category_name,
  c.id as category_id,
  COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
GROUP BY c.id, c.name
ORDER BY c.name;

-- 5. If products have wrong category_id, update them
-- Example: Update Classic Cotton T-Shirt to have correct category_id
-- UPDATE products 
-- SET category_id = (SELECT id FROM categories WHERE slug = 'mens-clothing')
-- WHERE name = 'Classic Cotton T-Shirt';
