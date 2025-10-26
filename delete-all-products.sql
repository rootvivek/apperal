-- Delete All Products from Database
-- This will also cascade delete all related data (images, cart items, etc.)

-- WARNING: This will DELETE ALL products permanently!
-- Make sure you have a backup if you need the data later

-- Option 1: Delete products one by one (cascades automatically)
DELETE FROM products;

-- Verify deletion
SELECT COUNT(*) as remaining_products FROM products;
SELECT 'Products deleted' as status;

-- If you want to delete related data manually, uncomment below:

-- Delete all product images
-- DELETE FROM product_images;

-- Delete all cart items that reference products
-- DELETE FROM cart_items;

-- Delete all wishlist items that reference products
-- DELETE FROM wishlist;

-- If you want to also delete categories (be careful!)
-- DELETE FROM categories;

-- Check what's left in the database
SELECT 
    'products' as table_name, 
    COUNT(*) as row_count 
FROM products
UNION ALL
SELECT 
    'product_images', 
    COUNT(*) 
FROM product_images
UNION ALL
SELECT 
    'cart_items', 
    COUNT(*) 
FROM cart_items
UNION ALL
SELECT 
    'categories', 
    COUNT(*) 
FROM categories;

