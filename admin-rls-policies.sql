-- =============================================
-- Simple Admin RLS Policies
-- 
-- USER ROLES EXPLANATION:
-- 
-- 1. AUTHENTICATED USERS (Regular Users)
--    - Any logged-in user with valid session
--    - Can only VIEW active items (read-only)
--    - Cannot edit, delete, or see inactive items
-- 
-- 2. ADMIN USERS (Special Authenticated Users)
--    - Authenticated users whose phone matches admin phone
--    - Full access: view, edit, delete, insert (everything)
--    - Can see both active and inactive items
--    - Determined by check_admin_by_phone() function
-- 
-- 3. SERVICE ROLE (System/Bypass - NOT used here)
--    - Server-side only, bypasses ALL RLS
--    - Used in API routes (/api/admin/*)
--    - Never used in client-side code
-- 
-- RULES:
-- - Admins: Full access (view, edit, delete, insert - everything)
-- - Users: Can only view active items
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

-- Insert admin phone (exactly 10 digits: 8881765192)
INSERT INTO app_config (key, value) 
VALUES ('admin_phone', '8881765192')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Function to check if current user is admin
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
  WHERE id = auth.uid()::text;
  
  -- If no user or no phone, return false
  IF user_phone IS NULL OR admin_phone IS NULL THEN
    RETURN false;
  END IF;
  
  -- Normalize both phones and extract last 10 digits
  user_phone := regexp_replace(user_phone, '[^0-9]', '', 'g');
  admin_phone := regexp_replace(admin_phone, '[^0-9]', '', 'g');
  user_phone := RIGHT(user_phone, 10);
  admin_phone := RIGHT(admin_phone, 10);
  
  RETURN user_phone = admin_phone AND user_phone != '' AND LENGTH(user_phone) = 10;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CATEGORIES: Simple policies
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Admins can view all categories" ON categories;
DROP POLICY IF EXISTS "Admins have full access to categories" ON categories;
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
DROP POLICY IF EXISTS "Users can view active categories" ON categories;

-- Users: Can view active categories only
CREATE POLICY "Users can view active categories"
ON categories
FOR SELECT
USING (is_active = true);

-- Admins: Full access - Split into separate policies for better control
CREATE POLICY "Admins can view all categories"
ON categories
FOR SELECT
TO authenticated
USING (check_admin_by_phone());

CREATE POLICY "Admins can update categories"
ON categories
FOR UPDATE
TO authenticated
USING (check_admin_by_phone())
WITH CHECK (check_admin_by_phone());

CREATE POLICY "Admins can insert categories"
ON categories
FOR INSERT
TO authenticated
WITH CHECK (check_admin_by_phone());

CREATE POLICY "Admins can delete categories"
ON categories
FOR DELETE
TO authenticated
USING (check_admin_by_phone());

-- =============================================
-- SUBCATEGORIES: Simple policies
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage subcategories" ON subcategories;
DROP POLICY IF EXISTS "Admins can view all subcategories" ON subcategories;
DROP POLICY IF EXISTS "Admins have full access to subcategories" ON subcategories;
DROP POLICY IF EXISTS "Anyone can view active subcategories" ON subcategories;
DROP POLICY IF EXISTS "Users can view active subcategories" ON subcategories;

-- Users: Can view active subcategories only
CREATE POLICY "Users can view active subcategories"
ON subcategories
FOR SELECT
USING (is_active = true);

-- Admins: Full access - Split into separate policies for better control
CREATE POLICY "Admins can view all subcategories"
ON subcategories
FOR SELECT
TO authenticated
USING (check_admin_by_phone());

CREATE POLICY "Admins can update subcategories"
ON subcategories
FOR UPDATE
TO authenticated
USING (check_admin_by_phone())
WITH CHECK (check_admin_by_phone());

CREATE POLICY "Admins can insert subcategories"
ON subcategories
FOR INSERT
TO authenticated
WITH CHECK (check_admin_by_phone());

CREATE POLICY "Admins can delete subcategories"
ON subcategories
FOR DELETE
TO authenticated
USING (check_admin_by_phone());

-- =============================================
-- PRODUCTS: Simple policies
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins can view all products" ON products;
DROP POLICY IF EXISTS "Admins have full access to products" ON products;
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Users can view active products" ON products;

-- Users: Can view active products only
CREATE POLICY "Users can view active products"
ON products
FOR SELECT
USING (is_active = true);

-- Admins: Full access - Split into separate policies for better control
CREATE POLICY "Admins can view all products"
ON products
FOR SELECT
TO authenticated
USING (check_admin_by_phone());

CREATE POLICY "Admins can update products"
ON products
FOR UPDATE
TO authenticated
USING (check_admin_by_phone())
WITH CHECK (check_admin_by_phone());

CREATE POLICY "Admins can insert products"
ON products
FOR INSERT
TO authenticated
WITH CHECK (check_admin_by_phone());

CREATE POLICY "Admins can delete products"
ON products
FOR DELETE
TO authenticated
USING (check_admin_by_phone());

-- =============================================
-- PRODUCT_IMAGES: Simple policies
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage product_images" ON product_images;
DROP POLICY IF EXISTS "Admins have full access to product_images" ON product_images;
DROP POLICY IF EXISTS "Anyone can view product_images" ON product_images;
DROP POLICY IF EXISTS "Users can view product_images" ON product_images;

-- Users: Can view product images
CREATE POLICY "Users can view product_images"
ON product_images
FOR SELECT
USING (true);

-- Admins: Full access (view, edit, delete, insert - everything)
CREATE POLICY "Admins have full access to product_images"
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

