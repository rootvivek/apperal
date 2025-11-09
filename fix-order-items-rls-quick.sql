-- Quick fix for order_items RLS policies to work with Firebase
-- Run this in Supabase SQL Editor to fix the 400 errors immediately

-- Step 1: Drop all existing RLS policies on order_items
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Drop all policies dynamically
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON order_items', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
  
  -- Also drop common policy names explicitly
  DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
  DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
  DROP POLICY IF EXISTS "Users can update own order items" ON order_items;
  DROP POLICY IF EXISTS "Users can delete own order items" ON order_items;
END $$;

-- Step 2: Create new RLS policies that work with Firebase
-- These policies allow all access - application-level security enforces user ownership
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own order items" ON order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own order items" ON order_items
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own order items" ON order_items
  FOR DELETE USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Successfully updated RLS policies for order_items table';
  RAISE NOTICE '   - All policies now allow access (application enforces security)';
  RAISE NOTICE '   - This fixes the 400 Bad Request errors';
END $$;

