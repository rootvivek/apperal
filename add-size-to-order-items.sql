-- Add size column to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS size VARCHAR(50);

