-- Simple RLS setup: Allow service_role to do EVERYTHING
-- This is the simplest approach - service_role bypasses RLS by default
-- But we'll create explicit policies to ensure it works
-- Run this in your Supabase SQL Editor

-- ============================================
-- CATEGORIES: Allow service_role all operations
-- ============================================
DROP POLICY IF EXISTS "Service role full access categories" ON categories;
CREATE POLICY "Service role full access categories"
ON categories
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- SUBCATEGORIES: Allow service_role all operations
-- ============================================
DROP POLICY IF EXISTS "Service role full access subcategories" ON subcategories;
CREATE POLICY "Service role full access subcategories"
ON subcategories
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- PRODUCTS: Allow service_role all operations
-- ============================================
DROP POLICY IF EXISTS "Service role full access products" ON products;
CREATE POLICY "Service role full access products"
ON products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- PRODUCT_IMAGES: Allow service_role all operations
-- ============================================
DROP POLICY IF EXISTS "Service role full access product_images" ON product_images;
CREATE POLICY "Service role full access product_images"
ON product_images
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- Verify policies
-- ============================================
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('categories', 'subcategories', 'products', 'product_images')
  AND 'service_role' = ANY(roles)
ORDER BY tablename;

