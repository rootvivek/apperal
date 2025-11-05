-- Remove gender column from product_apparel_details table
-- This migration removes the gender field from the apparel product details table

-- Drop the gender column if it exists
ALTER TABLE product_apparel_details 
DROP COLUMN IF EXISTS gender;

-- Add a comment to document the change
COMMENT ON TABLE product_apparel_details IS 'Apparel product details without gender field (removed as per requirements)';

