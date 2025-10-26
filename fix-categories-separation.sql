-- Fix Categories and Subcategories Separation in Database

-- Step 1: Move subcategories from categories table to subcategories table
-- First, insert any subcategories from categories table into subcategories table
INSERT INTO subcategories (
  id, 
  name, 
  slug, 
  description, 
  image_url, 
  parent_category_id, 
  created_at, 
  updated_at
)
SELECT 
  id,
  name,
  slug,
  description,
  image_url,
  parent_category_id,
  created_at,
  updated_at
FROM categories
WHERE parent_category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM subcategories s WHERE s.id = categories.id
  )
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Remove subcategories from categories table
DELETE FROM categories WHERE parent_category_id IS NOT NULL;

-- Step 3: Verify the separation
SELECT 'Categories count (should have NO parent_category_id):' as info;
SELECT COUNT(*) as count FROM categories WHERE parent_category_id IS NOT NULL;
-- Should show 0

SELECT 'Subcategories count:' as info;
SELECT COUNT(*) as count FROM subcategories;
-- Should show the number of subcategories

-- Step 4: Show sample data
SELECT 'Sample Main Categories:' as info;
SELECT id, name, slug FROM categories LIMIT 5;

SELECT 'Sample Subcategories:' as info;
SELECT s.id, s.name, s.slug, c.name as parent_category
FROM subcategories s
LEFT JOIN categories c ON s.parent_category_id = c.id
LIMIT 5;

SELECT 'Categories and Subcategories separated successfully in database!' as status;

