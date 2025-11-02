-- Update product_cover_details table structure
-- Remove old columns and add new ones: brand, compatible_model, type, color

-- First, remove old columns that are no longer needed
ALTER TABLE product_cover_details 
DROP COLUMN IF EXISTS ram,
DROP COLUMN IF EXISTS storage,
DROP COLUMN IF EXISTS battery,
DROP COLUMN IF EXISTS camera,
DROP COLUMN IF EXISTS display,
DROP COLUMN IF EXISTS os;

-- Add new columns if they don't exist
ALTER TABLE product_cover_details 
ADD COLUMN IF NOT EXISTS compatible_model VARCHAR(255),
ADD COLUMN IF NOT EXISTS type VARCHAR(100),
ADD COLUMN IF NOT EXISTS color VARCHAR(100);

-- Ensure brand column exists (it should already exist, but adding IF NOT EXISTS for safety)
ALTER TABLE product_cover_details 
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Updated product_cover_details table structure:';
    RAISE NOTICE '   Removed: ram, storage, battery, camera, display, os';
    RAISE NOTICE '   Columns now: brand, compatible_model, type, color';
    RAISE NOTICE '   + id, product_id, created_at, updated_at';
END $$;

