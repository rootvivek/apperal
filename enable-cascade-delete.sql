-- Enable CASCADE delete for all foreign keys
-- This allows deleting products even if they have related data

-- Step 1: Drop existing foreign key constraints
ALTER TABLE product_images 
DROP CONSTRAINT IF EXISTS product_images_product_id_fkey;

ALTER TABLE cart_items 
DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;

ALTER TABLE cart_items 
DROP CONSTRAINT IF EXISTS cart_items_cart_id_fkey;

ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_category_id_fkey;

-- Step 2: Recreate them with CASCADE
ALTER TABLE product_images 
ADD CONSTRAINT product_images_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_cart_id_fkey 
FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE;

ALTER TABLE products 
ADD CONSTRAINT products_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Now you can delete products and related data will be deleted too!
SELECT 'CASCADE delete enabled successfully!' as status;

