-- Create Separate Tables for Categories and Subcategories

-- Step 1: Create subcategories table from scratch
-- First drop it if exists
DROP TABLE IF EXISTS subcategories CASCADE;

-- Create the subcategories table
CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_category_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Foreign key to categories
  CONSTRAINT fk_parent_category 
    FOREIGN KEY (parent_category_id) 
    REFERENCES categories(id) 
    ON DELETE CASCADE
);

-- Step 2: Migrate existing subcategory data
-- Copy categories that have a parent_category_id into subcategories table
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
ON CONFLICT (slug) DO NOTHING;

-- Step 3: Clean up categories table to only have main categories
-- Keep categories that DON'T have a parent
DELETE FROM categories WHERE parent_category_id IS NOT NULL;

-- Step 4: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_subcategories_parent_id 
ON subcategories(parent_category_id);

CREATE INDEX IF NOT EXISTS idx_categories_name 
ON categories(name);

-- Step 5: Verify the separation
SELECT 'Total Categories (main only):' as info;
SELECT COUNT(*) as count FROM categories WHERE parent_category_id IS NULL;

SELECT 'Total Subcategories:' as info;
SELECT COUNT(*) as count FROM subcategories;

-- Step 6: Show structure
SELECT 'Categories table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categories'
ORDER BY ordinal_position;

SELECT 'Subcategories table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subcategories'
ORDER BY ordinal_position;

-- Step 7: Sample data
SELECT 'Sample Categories:' as info;
SELECT id, name, slug FROM categories LIMIT 5;

SELECT 'Sample Subcategories with Parent:' as info;
SELECT 
  s.id, 
  s.name, 
  s.slug,
  c.name as parent_category 
FROM subcategories s 
LEFT JOIN categories c ON s.parent_category_id = c.id 
LIMIT 5;

SELECT 'Categories and Subcategories separated successfully!' as status;

