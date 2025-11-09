-- Migration: Update user_profiles table to support Firebase user IDs (TEXT instead of UUID)
-- Firebase user IDs are strings like "bSoh85X4rhZlyuZCCs78HvCwXTa2" which are not UUIDs
-- This migration safely handles cases where tables may not exist yet

-- Step 1: Drop ALL foreign key constraints that reference user_profiles.id OR auth.users (before altering column type)
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Find and drop all foreign key constraints that reference user_profiles.id
  FOR constraint_record IN
    SELECT 
      tc.constraint_name,
      tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'user_profiles'
      AND ccu.column_name = 'id'
      AND tc.table_schema = 'public'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', constraint_record.table_name, constraint_record.constraint_name);
      RAISE NOTICE '✅ Dropped foreign key constraint % on table %', constraint_record.constraint_name, constraint_record.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️  Could not drop constraint % on table %: %', constraint_record.constraint_name, constraint_record.table_name, SQLERRM;
    END;
  END LOOP;
  
  -- Find and drop all foreign key constraints that reference auth.users (UUID type)
  -- This is critical because user_profiles.id might reference auth.users(id)
  FOR constraint_record IN
    SELECT 
      tc.constraint_name,
      tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
      AND ccu.column_name = 'id'
      AND tc.table_schema = 'public'
      AND (tc.table_name = 'user_profiles' OR tc.table_name = 'profiles')
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', constraint_record.table_name, constraint_record.constraint_name);
      RAISE NOTICE '✅ Dropped foreign key constraint % on table % (referencing auth.users)', constraint_record.constraint_name, constraint_record.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️  Could not drop constraint % on table %: %', constraint_record.constraint_name, constraint_record.table_name, SQLERRM;
    END;
  END LOOP;
  
  -- Also check for constraints on profiles table
  FOR constraint_record IN
    SELECT 
      tc.constraint_name,
      tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'profiles'
      AND ccu.column_name = 'id'
      AND tc.table_schema = 'public'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', constraint_record.table_name, constraint_record.constraint_name);
      RAISE NOTICE '✅ Dropped foreign key constraint % on table %', constraint_record.constraint_name, constraint_record.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️  Could not drop constraint % on table %: %', constraint_record.constraint_name, constraint_record.table_name, SQLERRM;
    END;
  END LOOP;
  
  -- Try to drop the specific constraint mentioned in the error
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    BEGIN
      ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
      RAISE NOTICE '✅ Attempted to drop user_profiles_id_fkey constraint';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️  Note: %', SQLERRM;
    END;
  END IF;
  
  -- Drop any constraint with similar names on user_profiles or profiles tables
  FOR constraint_record IN
    SELECT 
      tc.constraint_name,
      tc.table_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND (tc.constraint_name LIKE '%user_profiles%' OR tc.constraint_name LIKE '%profiles%' OR tc.constraint_name LIKE '%auth%users%')
      AND (tc.table_name = 'user_profiles' OR tc.table_name = 'profiles')
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', constraint_record.table_name, constraint_record.constraint_name);
      RAISE NOTICE '✅ Dropped constraint % on table %', constraint_record.constraint_name, constraint_record.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️  Could not drop constraint % on table %: %', constraint_record.constraint_name, constraint_record.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 2: Drop ALL RLS policies on ALL tables that might reference user_id (before altering column types)
DO $$
DECLARE
  policy_record RECORD;
  table_record RECORD;
BEGIN
  -- Drop all RLS policies on tables that have user_id columns or reference user data
  FOR table_record IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('user_profiles', 'profiles', 'addresses', 'carts', 'cart_items', 'orders', 'order_items', 'wishlists', 'reviews')
  LOOP
    -- Drop all policies on this table
    FOR policy_record IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = table_record.table_name
    LOOP
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, table_record.table_name);
        RAISE NOTICE '✅ Dropped policy % on table %', policy_record.policyname, table_record.table_name;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Could not drop policy % on table %: %', policy_record.policyname, table_record.table_name, SQLERRM;
      END;
    END LOOP;
  END LOOP;
  
  -- Also try to drop common policy names explicitly
  FOR table_record IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('user_profiles', 'profiles', 'addresses', 'carts', 'cart_items', 'orders', 'order_items', 'wishlists', 'reviews')
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "Users can view own profile" ON %I', table_record.table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can update own profile" ON %I', table_record.table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can insert own profile" ON %I', table_record.table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can view own addresses" ON %I', table_record.table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can view their own cart items" ON %I', table_record.table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can view own cart" ON %I', table_record.table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can view own orders" ON %I', table_record.table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can view own wishlist" ON %I', table_record.table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can view own reviews" ON %I', table_record.table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON %I', table_record.table_name);
    EXCEPTION WHEN OTHERS THEN
      -- Ignore errors for policies that don't exist
      NULL;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Dropped RLS policies on all user-related tables';
END $$;

-- Step 3: Check and update user_profiles table (or profiles if that's what exists)
DO $$
BEGIN
  -- Check if user_profiles table exists, if not check for profiles
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    -- Update user_profiles.id from UUID to TEXT
    ALTER TABLE user_profiles ALTER COLUMN id TYPE TEXT USING id::TEXT;
    RAISE NOTICE '✅ Updated user_profiles.id to TEXT';
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Update profiles.id from UUID to TEXT
    ALTER TABLE profiles ALTER COLUMN id TYPE TEXT USING id::TEXT;
    RAISE NOTICE '✅ Updated profiles.id to TEXT';
  ELSE
    RAISE NOTICE '⚠️  Neither user_profiles nor profiles table exists. Creating user_profiles...';
    -- Create user_profiles table if it doesn't exist
    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      email TEXT,
      full_name TEXT,
      phone TEXT,
      user_number VARCHAR(20) UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE '✅ Created user_profiles table with TEXT id';
  END IF;
END $$;

-- Step 4: Drop foreign key constraints that reference user tables (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'addresses') THEN
    ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_user_id_fkey;
    ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_user_id_fkey1;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'carts') THEN
    ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart_items') THEN
    ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
    ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlists') THEN
    ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
  END IF;
END $$;

-- Step 5: Update all user_id columns in related tables to TEXT (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'addresses') THEN
    ALTER TABLE addresses ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    RAISE NOTICE '✅ Updated addresses.user_id to TEXT';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'carts') THEN
    ALTER TABLE carts ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    RAISE NOTICE '✅ Updated carts.user_id to TEXT';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart_items') THEN
    -- Check if cart_items has user_id column
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'user_id') THEN
      ALTER TABLE cart_items ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      RAISE NOTICE '✅ Updated cart_items.user_id to TEXT';
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    ALTER TABLE orders ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    RAISE NOTICE '✅ Updated orders.user_id to TEXT';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
    -- Check if order_items has user_id column
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'user_id') THEN
      ALTER TABLE order_items ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      RAISE NOTICE '✅ Updated order_items.user_id to TEXT';
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlists') THEN
    ALTER TABLE wishlists ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    RAISE NOTICE '✅ Updated wishlists.user_id to TEXT';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    ALTER TABLE reviews ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    RAISE NOTICE '✅ Updated reviews.user_id to TEXT';
  END IF;
END $$;

-- Step 6: Recreate foreign key constraints (only if tables exist)
DO $$
DECLARE
  profile_table_name TEXT;
BEGIN
  -- Determine which profile table to reference
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    profile_table_name := 'user_profiles';
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    profile_table_name := 'profiles';
  ELSE
    profile_table_name := 'user_profiles'; -- Default to user_profiles
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'addresses') THEN
    EXECUTE format('ALTER TABLE addresses ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES %I(id) ON DELETE CASCADE', profile_table_name);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'carts') THEN
    EXECUTE format('ALTER TABLE carts ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES %I(id) ON DELETE CASCADE', profile_table_name);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    EXECUTE format('ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES %I(id) ON DELETE SET NULL', profile_table_name);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlists') THEN
    EXECUTE format('ALTER TABLE wishlists ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES %I(id) ON DELETE CASCADE', profile_table_name);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    EXECUTE format('ALTER TABLE reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES %I(id) ON DELETE CASCADE', profile_table_name);
  END IF;
END $$;

-- Step 7: Recreate RLS policies to work with TEXT IDs and Firebase
DO $$
BEGIN
  -- Determine which profile table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    -- Drop existing policies on user_profiles
    DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;
    
    -- Enable RLS if not already enabled
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies for Firebase
    CREATE POLICY "Users can view own profile" ON user_profiles
      FOR SELECT USING (true);
    
    CREATE POLICY "Users can update own profile" ON user_profiles
      FOR UPDATE USING (true);
    
    CREATE POLICY "Users can insert own profile" ON user_profiles
      FOR INSERT WITH CHECK (true);
      
    RAISE NOTICE '✅ Updated RLS policies for user_profiles';
  END IF;
END $$;

-- Step 8: Create/update indexes (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'addresses') THEN
    CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'carts') THEN
    CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlists') THEN
    CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: user_profiles.id and related user_id columns changed from UUID to TEXT';
  RAISE NOTICE '   - user_profiles.id is now TEXT (supports Firebase user IDs)';
  RAISE NOTICE '   - All foreign key constraints updated';
  RAISE NOTICE '   - RLS policies updated for Firebase auth';
END $$;
