-- =============================================
-- Fix for Slug Constraint Error
-- =============================================

-- Update the products table to handle slug generation
-- This will fix the "null value in column slug" error

-- First, let's add a function to generate slugs
CREATE OR REPLACE FUNCTION generate_product_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- If slug is null or empty, generate it from the name
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
        -- Remove leading/trailing dashes
        NEW.slug := regexp_replace(NEW.slug, '^-+|-+$', '', 'g');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate slug before insert
DROP TRIGGER IF EXISTS generate_product_slug_trigger ON products;
CREATE TRIGGER generate_product_slug_trigger
    BEFORE INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION generate_product_slug();

-- Also update existing products that might have null slugs
UPDATE products 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Remove leading/trailing dashes from existing slugs
UPDATE products 
SET slug = regexp_replace(slug, '^-+|-+$', '', 'g')
WHERE slug ~ '^-+|-+$';

-- Verify the fix
SELECT 'Slug generation trigger created successfully!' as message;
