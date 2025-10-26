-- Add slugs to existing products that don't have them
-- This will generate slugs from product names

-- Update products without slugs
UPDATE products
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Handle any duplicate slugs by appending a number
DO $$
DECLARE
    product_record RECORD;
    counter INTEGER;
BEGIN
    FOR product_record IN 
        SELECT id, name, slug 
        FROM products 
        WHERE (slug IN (
            SELECT slug FROM products GROUP BY slug HAVING COUNT(*) > 1
        ))
    LOOP
        counter := 1;
        -- Keep appending counter until we get a unique slug
        WHILE EXISTS (
            SELECT 1 FROM products WHERE slug = product_record.slug AND id != product_record.id
        ) LOOP
            product_record.slug := product_record.slug || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        UPDATE products SET slug = product_record.slug WHERE id = product_record.id;
    END LOOP;
END $$;

