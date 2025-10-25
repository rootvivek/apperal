-- Add sample categories to test the subcategory dropdown functionality
-- This script adds categories that match our subcategory mapping

-- Insert sample categories if they don't exist
INSERT INTO categories (name, slug, description, parent_category_id)
SELECT 'Men''s Clothing', 'mens-clothing', 'Clothing and accessories for men', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'mens-clothing');

INSERT INTO categories (name, slug, description, parent_category_id)
SELECT 'Women''s Clothing', 'womens-clothing', 'Clothing and accessories for women', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'womens-clothing');

INSERT INTO categories (name, slug, description, parent_category_id)
SELECT 'Accessories', 'accessories', 'Fashion accessories and jewelry', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'accessories');

INSERT INTO categories (name, slug, description, parent_category_id)
SELECT 'Electronics', 'electronics', 'Electronic devices and gadgets', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'electronics');

INSERT INTO categories (name, slug, description, parent_category_id)
SELECT 'Kids'' Clothing', 'kids-clothing', 'Clothing for children', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'kids-clothing');

-- Verify the categories were added
SELECT id, name, slug FROM categories ORDER BY name;
