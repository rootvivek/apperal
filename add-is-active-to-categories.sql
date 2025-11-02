-- Add is_active column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Add is_active column to subcategories table
ALTER TABLE subcategories 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Update existing records to be active by default
UPDATE categories SET is_active = true WHERE is_active IS NULL;
UPDATE subcategories SET is_active = true WHERE is_active IS NULL;

