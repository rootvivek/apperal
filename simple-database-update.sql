-- Simple script to add pricing and badge fields
-- Run this in your Supabase SQL Editor

-- Add new columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge VARCHAR(20) DEFAULT NULL;

-- Update existing products to have original_price = price if not set
UPDATE products 
SET original_price = price 
WHERE original_price IS NULL;
