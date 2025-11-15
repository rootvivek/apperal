-- =============================================
-- Admin RLS Policies
-- This allows authenticated admin users to perform all operations
-- Admin is determined by phone number matching admin phone
-- 
-- IMPORTANT: You MUST run this SQL file in your Supabase SQL Editor
-- for the status toggle buttons to work in the admin panel!
-- 
-- Steps:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste the entire contents of this file
-- 4. Click "Run" to execute
-- 5. Verify the policies were created (the SELECT query at the end will show them)
-- =============================================

-- Create a config table to store admin phone (one-time setup)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert admin phone (update this with your actual admin phone)
-- Run this once to set the admin phone
INSERT INTO app_config (key, value) 
VALUES ('admin_phone', '+918881765192')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Function to check if current user is admin
-- This function checks if the user's phone number matches the admin phone
CREATE OR REPLACE FUNCTION check_admin_by_phone()
RETURNS BOOLEAN AS $$
DECLARE
  user_phone TEXT;
  admin_phone TEXT;
BEGIN
  -- Get admin phone from config table
  SELECT value INTO admin_phone
  FROM app_config
  WHERE key = 'admin_phone';
  
  -- Get current user's phone from user_profiles
  SELECT phone INTO user_phone
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- If no user or no phone, return false
  IF user_phone IS NULL OR admin_phone IS NULL THEN
    RETURN false;
  END IF;
  
  -- Normalize both phones (remove non-digits)
  user_phone := regexp_replace(user_phone, '[^0-9]', '', 'g');
  admin_phone := regexp_replace(admin_phone, '[^0-9]', '', 'g');
  
  -- Return true if they match
  RETURN user_phone = admin_phone AND user_phone != '';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CATEGORIES: Admin policies
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;

-- Allow anyone to view active categories
CREATE POLICY "Anyone can view active categories"
ON categories
FOR SELECT
USING (is_active = true);

-- Allow admins to do everything with categories (including inactive ones)
CREATE POLICY "Admins can manage categories"
ON categories
FOR ALL
TO authenticated
USING (check_admin_by_phone())
WITH CHECK (check_admin_by_phone());

-- Allow admins to view inactive categories too
CREATE POLICY "Admins can view all categories"
ON categories
FOR SELECT
TO authenticated
USING (check_admin_by_phone());

-- =============================================
-- SUBCATEGORIES: Admin policies
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage subcategories" ON subcategories;
DROP POLICY IF EXISTS "Anyone can view active subcategories" ON subcategories;

-- Allow anyone to view active subcategories
CREATE POLICY "Anyone can view active subcategories"
ON subcategories
FOR SELECT
USING (is_active = true);

-- Allow admins to do everything with subcategories (including inactive ones)
CREATE POLICY "Admins can manage subcategories"
ON subcategories
FOR ALL
TO authenticated
USING (check_admin_by_phone())
WITH CHECK (check_admin_by_phone());

-- Allow admins to view inactive subcategories too
CREATE POLICY "Admins can view all subcategories"
ON subcategories
FOR SELECT
TO authenticated
USING (check_admin_by_phone());

-- =============================================
-- PRODUCTS: Admin policies
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Anyone can view active products" ON products;

-- Allow anyone to view active products
CREATE POLICY "Anyone can view active products"
ON products
FOR SELECT
USING (is_active = true);

-- Allow admins to do everything with products (including inactive ones)
CREATE POLICY "Admins can manage products"
ON products
FOR ALL
TO authenticated
USING (check_admin_by_phone())
WITH CHECK (check_admin_by_phone());

-- Allow admins to view inactive products too
CREATE POLICY "Admins can view all products"
ON products
FOR SELECT
TO authenticated
USING (check_admin_by_phone());

-- =============================================
-- PRODUCT_IMAGES: Admin policies
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage product_images" ON product_images;
DROP POLICY IF EXISTS "Anyone can view product_images" ON product_images;

-- Allow anyone to view product images
CREATE POLICY "Anyone can view product_images"
ON product_images
FOR SELECT
USING (true);

-- Allow admins to do everything with product images
CREATE POLICY "Admins can manage product_images"
ON product_images
FOR ALL
TO authenticated
USING (check_admin_by_phone())
WITH CHECK (check_admin_by_phone());

-- =============================================
-- Verify policies
-- =============================================
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('categories', 'subcategories', 'products', 'product_images')
ORDER BY tablename, policyname;

