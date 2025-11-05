-- Drop the existing unique constraint on cart_id and product_id
-- This constraint doesn't account for size, preventing same product with different sizes
ALTER TABLE cart_items 
DROP CONSTRAINT IF EXISTS cart_items_cart_id_product_id_key;

-- Create a unique index that handles NULL sizes properly
-- For NULL sizes, we use COALESCE to convert to empty string so they're treated as the same
-- This allows the same product with different sizes (including NULL) to be separate cart items
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_cart_id_product_id_size_unique 
ON cart_items (cart_id, product_id, COALESCE(size, ''));

