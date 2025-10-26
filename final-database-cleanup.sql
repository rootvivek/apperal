-- FINAL Database Cleanup - Remove All Unnecessary Items

-- Step 1: Drop unnecessary materialized views
DROP MATERIALIZED VIEW IF EXISTS all_products_data CASCADE;
DROP MATERIALIZED VIEW IF EXISTS home_page_data CASCADE;

-- Step 2: Drop unnecessary views
DROP VIEW IF EXISTS products_with_subcategories CASCADE;
DROP VIEW IF EXISTS categories_with_children CASCADE;

-- Step 3: Drop unnecessary functions
DROP FUNCTION IF EXISTS refresh_home_page_data() CASCADE;
DROP FUNCTION IF EXISTS refresh_all_products_data() CASCADE;
DROP FUNCTION IF EXISTS get_navigation_categories() CASCADE;
DROP FUNCTION IF EXISTS get_home_page_data() CASCADE;
DROP FUNCTION IF EXISTS get_category_products() CASCADE;
DROP FUNCTION IF EXISTS get_subcategory_products() CASCADE;
DROP FUNCTION IF EXISTS search_products() CASCADE;

-- Step 4: Drop unnecessary triggers
DROP TRIGGER IF EXISTS trigger_refresh_views ON products CASCADE;
DROP TRIGGER IF EXISTS trigger_refresh_views ON categories CASCADE;
DROP TRIGGER IF EXISTS trigger_refresh_views ON cart_items CASCADE;

-- Step 5: Remove unnecessary constraints (if any)
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_with_children CASCADE;

-- Step 6: List what remains (verification)
SELECT 'Remaining Tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT 'Remaining Views:' as info;
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

SELECT 'Cleanup complete! Check tables above to verify.' as status;

