-- Migration: Update product_apparel_details table schema
-- Add missing columns: brand, material, fit_type, pattern, sku
-- Remove old columns: fabric, gender (if they exist and are not needed)

-- First, check if columns exist and add them if they don't
-- Add brand column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_apparel_details' 
        AND column_name = 'brand'
    ) THEN
        ALTER TABLE product_apparel_details 
        ADD COLUMN brand VARCHAR(255);
    END IF;
END $$;

-- Add material column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_apparel_details' 
        AND column_name = 'material'
    ) THEN
        ALTER TABLE product_apparel_details 
        ADD COLUMN material VARCHAR(255);
    END IF;
END $$;

-- Add fit_type column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_apparel_details' 
        AND column_name = 'fit_type'
    ) THEN
        ALTER TABLE product_apparel_details 
        ADD COLUMN fit_type VARCHAR(255);
    END IF;
END $$;

-- Add pattern column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_apparel_details' 
        AND column_name = 'pattern'
    ) THEN
        ALTER TABLE product_apparel_details 
        ADD COLUMN pattern VARCHAR(255);
    END IF;
END $$;

-- Add sku column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_apparel_details' 
        AND column_name = 'sku'
    ) THEN
        ALTER TABLE product_apparel_details 
        ADD COLUMN sku VARCHAR(100);
    END IF;
END $$;

-- Make size and color nullable (they might be NOT NULL in old schema)
-- This allows for products that don't have these values yet
DO $$ 
BEGIN
    -- Make size nullable if it's currently NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_apparel_details' 
        AND column_name = 'size'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE product_apparel_details 
        ALTER COLUMN size DROP NOT NULL;
    END IF;
    
    -- Make color nullable if it's currently NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_apparel_details' 
        AND column_name = 'color'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE product_apparel_details 
        ALTER COLUMN color DROP NOT NULL;
    END IF;
END $$;

-- Optional: Migrate data from old 'fabric' column to 'material' if fabric exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_apparel_details' 
        AND column_name = 'fabric'
    ) THEN
        -- Copy fabric data to material if material is empty
        UPDATE product_apparel_details 
        SET material = fabric 
        WHERE (material IS NULL OR material = '') 
        AND fabric IS NOT NULL 
        AND fabric != '';
    END IF;
END $$;

-- Remove gender column (if exists) - not required
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_apparel_details' 
        AND column_name = 'gender'
    ) THEN
        ALTER TABLE product_apparel_details 
        DROP COLUMN gender;
    END IF;
END $$;

-- Add comments to document the columns
COMMENT ON COLUMN product_apparel_details.brand IS 'Brand name of the apparel product';
COMMENT ON COLUMN product_apparel_details.material IS 'Material/fabric of the apparel product';
COMMENT ON COLUMN product_apparel_details.fit_type IS 'Fit type(s) - comma-separated values (e.g., Regular,Slim,Loose)';
COMMENT ON COLUMN product_apparel_details.pattern IS 'Pattern of the apparel (e.g., Solid, Striped, Printed)';
COMMENT ON COLUMN product_apparel_details.size IS 'Available size(s) - comma-separated values (e.g., Small,Medium,Large)';
COMMENT ON COLUMN product_apparel_details.color IS 'Color of the apparel product';
COMMENT ON COLUMN product_apparel_details.sku IS 'Stock Keeping Unit (SKU) for the product';

