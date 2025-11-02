-- Update product_apparel_details table structure
-- Remove old columns and add new ones

-- Remove old columns that are no longer needed
ALTER TABLE product_apparel_details 
DROP COLUMN IF EXISTS fabric;

-- Add new columns if they don't exist
ALTER TABLE product_apparel_details 
ADD COLUMN IF NOT EXISTS brand VARCHAR(255),
ADD COLUMN IF NOT EXISTS material VARCHAR(255),
ADD COLUMN IF NOT EXISTS fit_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS pattern VARCHAR(100),
ADD COLUMN IF NOT EXISTS sku VARCHAR(100);

-- Ensure existing columns exist (they should already exist)
ALTER TABLE product_apparel_details 
ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
ADD COLUMN IF NOT EXISTS color VARCHAR(100),
ADD COLUMN IF NOT EXISTS size VARCHAR(50);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Updated product_apparel_details table structure:';
    RAISE NOTICE '   Removed: fabric';
    RAISE NOTICE '   Columns now: brand, gender, material, fit_type, pattern, color, size, sku';
    RAISE NOTICE '   + id, product_id, created_at, updated_at';
    RAISE NOTICE '   Note: stock_quantity is in products table (common field)';
END $$;

