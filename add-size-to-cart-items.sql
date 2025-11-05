-- Add size column to cart_items table
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS size VARCHAR(50);

