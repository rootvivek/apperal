-- Update product_accessories_details table structure
-- Remove dimensions and weight columns

-- Remove columns that are no longer needed
ALTER TABLE product_accessories_details 
DROP COLUMN IF EXISTS dimensions,
DROP COLUMN IF EXISTS weight;

-- Ensure existing columns exist (they should already exist)
ALTER TABLE product_accessories_details 
ADD COLUMN IF NOT EXISTS accessory_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS compatible_with VARCHAR(255),
ADD COLUMN IF NOT EXISTS material VARCHAR(255),
ADD COLUMN IF NOT EXISTS color VARCHAR(100);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Updated product_accessories_details table structure:';
    RAISE NOTICE '   Removed: dimensions, weight';
    RAISE NOTICE '   Columns now: accessory_type, compatible_with, material, color';
    RAISE NOTICE '   + id, product_id, created_at, updated_at';
END $$;

