-- Check and create categories table if it doesn't exist
-- Run this in your Supabase SQL Editor

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Insert some sample categories if the table is empty
INSERT INTO categories (name, slug, description, parent_category_id)
SELECT * FROM (VALUES 
  ('Men''s Clothing', 'mens-clothing', 'Clothing and apparel for men', NULL),
  ('Women''s Clothing', 'womens-clothing', 'Clothing and apparel for women', NULL),
  ('Accessories', 'accessories', 'Fashion accessories and add-ons', NULL)
) AS v(name, slug, description, parent_category_id)
WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);

-- Show current categories
SELECT * FROM categories ORDER BY name;
