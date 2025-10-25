-- Add show_in_hero field to products table
ALTER TABLE products 
ADD COLUMN show_in_hero BOOLEAN DEFAULT FALSE;

-- Update existing products to not show in hero by default
UPDATE products 
SET show_in_hero = FALSE 
WHERE show_in_hero IS NULL;

-- Add comment to the column
COMMENT ON COLUMN products.show_in_hero IS 'Whether this product should be displayed in the hero section carousel';
