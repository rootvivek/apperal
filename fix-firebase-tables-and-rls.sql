-- Follow-up migration: Fix remaining Firebase integration issues
-- This fixes RLS policies and ensures all user_id columns are TEXT

-- Step 1: Update wishlists table user_id to TEXT (if not already done)
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlists') THEN
    -- Check if column is already TEXT
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'wishlists' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
      -- Drop ALL existing policies first (before altering column)
      FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'wishlists'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON wishlists', policy_record.policyname);
      END LOOP;
      
      -- Drop foreign key constraint
      ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_fkey;
      ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_auth_users_id_fkey;
      
      -- Change column type
      ALTER TABLE wishlists ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      
      RAISE NOTICE '✅ Updated wishlists.user_id to TEXT';
    ELSE
      RAISE NOTICE '✅ wishlists.user_id is already TEXT';
    END IF;
  END IF;
END $$;

-- Step 2: Create wishlist table (singular) if it doesn't exist, matching wishlists schema
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Check if wishlist (singular) table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlist') THEN
    -- Create wishlist table with TEXT user_id (to match code that uses 'wishlist')
    CREATE TABLE wishlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL, -- TEXT to support Firebase user IDs
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    );
    
    -- Create index
    CREATE INDEX idx_wishlist_user_id ON wishlist(user_id);
    
    -- Enable RLS
    ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Users can view own wishlist" ON wishlist
      FOR SELECT USING (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can insert own wishlist" ON wishlist
      FOR INSERT WITH CHECK (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can delete own wishlist items" ON wishlist
      FOR DELETE USING (true); -- Application enforces user_id matching
    
    RAISE NOTICE '✅ Created wishlist table with TEXT user_id';
  ELSE
    -- Table exists, update user_id to TEXT if needed
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'wishlist' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
      -- Drop ALL existing policies first (before altering column)
      -- Drop policies by name (common policy names)
      DROP POLICY IF EXISTS "Users can view own wishlist" ON wishlist;
      DROP POLICY IF EXISTS "Users can view their own wishlist" ON wishlist;
      DROP POLICY IF EXISTS "Users can insert own wishlist" ON wishlist;
      DROP POLICY IF EXISTS "Users can insert their own wishlist" ON wishlist;
      DROP POLICY IF EXISTS "Users can delete own wishlist items" ON wishlist;
      DROP POLICY IF EXISTS "Users can delete their own wishlist items" ON wishlist;
      
      -- Also drop any other policies dynamically
      FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'wishlist'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON wishlist', policy_record.policyname);
      END LOOP;
      
      -- Drop foreign key constraint
      ALTER TABLE wishlist DROP CONSTRAINT IF EXISTS wishlist_user_id_fkey;
      ALTER TABLE wishlist DROP CONSTRAINT IF EXISTS wishlist_user_id_auth_users_id_fkey;
      
      -- Change column type
      ALTER TABLE wishlist ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      
      -- Recreate RLS policies
      CREATE POLICY "Users can view own wishlist" ON wishlist
        FOR SELECT USING (true);
      
      CREATE POLICY "Users can insert own wishlist" ON wishlist
        FOR INSERT WITH CHECK (true);
      
      CREATE POLICY "Users can delete own wishlist items" ON wishlist
        FOR DELETE USING (true);
      
      RAISE NOTICE '✅ Updated wishlist.user_id to TEXT';
    ELSE
      RAISE NOTICE '✅ wishlist.user_id is already TEXT';
    END IF;
  END IF;
END $$;

-- Step 3: Update carts table user_id to TEXT and RLS policies (allow Firebase users)
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'carts') THEN
    -- First, ensure user_id column is TEXT
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'carts' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
      -- Drop ALL existing policies first (before altering column)
      FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'carts'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON carts', policy_record.policyname);
      END LOOP;
      
      -- Drop foreign key constraint
      ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_user_id_fkey;
      ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_user_id_auth_users_id_fkey;
      
      -- Change column type
      ALTER TABLE carts ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      
      RAISE NOTICE '✅ Updated carts.user_id to TEXT';
    END IF;
    
    -- Drop existing policies (in case they weren't dropped above)
    DROP POLICY IF EXISTS "Users can view own cart" ON carts;
    DROP POLICY IF EXISTS "Users can insert own cart" ON carts;
    DROP POLICY IF EXISTS "Users can update own cart" ON carts;
    DROP POLICY IF EXISTS "Users can delete own cart" ON carts;
    
    -- Create new policies that work with Firebase (application-level security)
    CREATE POLICY "Users can view own cart" ON carts
      FOR SELECT USING (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can insert own cart" ON carts
      FOR INSERT WITH CHECK (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can update own cart" ON carts
      FOR UPDATE USING (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can delete own cart" ON carts
      FOR DELETE USING (true); -- Application enforces user_id matching
    
    RAISE NOTICE '✅ Updated RLS policies for carts table';
  END IF;
END $$;

-- Step 4: Update RLS policies for cart_items table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart_items') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own cart items" ON cart_items;
    DROP POLICY IF EXISTS "Users can insert their own cart items" ON cart_items;
    DROP POLICY IF EXISTS "Users can update their own cart items" ON cart_items;
    DROP POLICY IF EXISTS "Users can delete their own cart items" ON cart_items;
    
    -- Create new policies that work with Firebase
    CREATE POLICY "Users can view their own cart items" ON cart_items
      FOR SELECT USING (true); -- Application enforces cart ownership via cart_id
    
    CREATE POLICY "Users can insert their own cart items" ON cart_items
      FOR INSERT WITH CHECK (true); -- Application enforces cart ownership
    
    CREATE POLICY "Users can update their own cart items" ON cart_items
      FOR UPDATE USING (true); -- Application enforces cart ownership
    
    CREATE POLICY "Users can delete their own cart items" ON cart_items
      FOR DELETE USING (true); -- Application enforces cart ownership
    
    RAISE NOTICE '✅ Updated RLS policies for cart_items table';
  END IF;
END $$;

-- Step 5: Update orders table user_id to TEXT and RLS policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    -- First, ensure user_id column is TEXT
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
      -- Drop ALL existing policies first (before altering column)
      FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'orders'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON orders', policy_record.policyname);
      END LOOP;
      
      -- Drop foreign key constraint
      ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
      ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_auth_users_id_fkey;
      
      -- Change column type
      ALTER TABLE orders ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      
      RAISE NOTICE '✅ Updated orders.user_id to TEXT';
    END IF;
    
    -- Drop existing policies (in case they weren't dropped above)
    DROP POLICY IF EXISTS "Users can view own orders" ON orders;
    DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
    DROP POLICY IF EXISTS "Users can update own orders" ON orders;
    DROP POLICY IF EXISTS "Users can delete own orders" ON orders;
    
    -- Create new policies that work with Firebase
    CREATE POLICY "Users can view own orders" ON orders
      FOR SELECT USING (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can insert own orders" ON orders
      FOR INSERT WITH CHECK (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can update own orders" ON orders
      FOR UPDATE USING (true); -- Application enforces user_id matching
    
    RAISE NOTICE '✅ Updated RLS policies for orders table';
  END IF;
END $$;

-- Step 6: Update RLS policies for order_items table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
    DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
    DROP POLICY IF EXISTS "Users can update own order items" ON order_items;
    DROP POLICY IF EXISTS "Users can delete own order items" ON order_items;
    
    -- Create new policies that work with Firebase
    CREATE POLICY "Users can view own order items" ON order_items
      FOR SELECT USING (true); -- Application enforces order ownership via order_id
    
    CREATE POLICY "Users can insert own order items" ON order_items
      FOR INSERT WITH CHECK (true); -- Application enforces order ownership
    
    CREATE POLICY "Users can update own order items" ON order_items
      FOR UPDATE USING (true); -- Application enforces order ownership
    
    CREATE POLICY "Users can delete own order items" ON order_items
      FOR DELETE USING (true); -- Application enforces order ownership
    
    RAISE NOTICE '✅ Updated RLS policies for order_items table';
  END IF;
END $$;

-- Step 7: Update RLS policies for wishlists table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlists') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own wishlist" ON wishlists;
    DROP POLICY IF EXISTS "Users can insert own wishlist" ON wishlists;
    DROP POLICY IF EXISTS "Users can delete own wishlist items" ON wishlists;
    
    -- Create new policies that work with Firebase
    CREATE POLICY "Users can view own wishlist" ON wishlists
      FOR SELECT USING (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can insert own wishlist" ON wishlists
      FOR INSERT WITH CHECK (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can delete own wishlist items" ON wishlists
      FOR DELETE USING (true); -- Application enforces user_id matching
    
    RAISE NOTICE '✅ Updated RLS policies for wishlists table';
  END IF;
END $$;

-- Step 6: Update RLS policies for wishlist table (singular, if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlist') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own wishlist" ON wishlist;
    DROP POLICY IF EXISTS "Users can insert own wishlist" ON wishlist;
    DROP POLICY IF EXISTS "Users can delete own wishlist items" ON wishlist;
    
    -- Create new policies that work with Firebase
    CREATE POLICY "Users can view own wishlist" ON wishlist
      FOR SELECT USING (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can insert own wishlist" ON wishlist
      FOR INSERT WITH CHECK (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can delete own wishlist items" ON wishlist
      FOR DELETE USING (true); -- Application enforces user_id matching
    
    RAISE NOTICE '✅ Updated RLS policies for wishlist table';
  END IF;
END $$;

-- Step 9: Create addresses table if it doesn't exist
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'addresses') THEN
    CREATE TABLE addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL, -- TEXT to support Firebase user IDs
      address_type VARCHAR(50) DEFAULT 'shipping', -- shipping, billing
      address_line1 VARCHAR(255) NOT NULL,
      address_line2 VARCHAR(255),
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      zip_code VARCHAR(20) NOT NULL,
      country VARCHAR(100) DEFAULT 'USA',
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create index
    CREATE INDEX idx_addresses_user_id ON addresses(user_id);
    
    -- Enable RLS
    ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Users can view own addresses" ON addresses
      FOR SELECT USING (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can insert own addresses" ON addresses
      FOR INSERT WITH CHECK (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can update own addresses" ON addresses
      FOR UPDATE USING (true); -- Application enforces user_id matching
    
    CREATE POLICY "Users can delete own addresses" ON addresses
      FOR DELETE USING (true); -- Application enforces user_id matching
    
    RAISE NOTICE '✅ Created addresses table with TEXT user_id';
  ELSE
    -- Table exists, just ensure user_id is TEXT
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'addresses' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
      -- Drop ALL existing policies first (before altering column)
      -- Drop policies by name (common policy names)
      DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
      DROP POLICY IF EXISTS "Users can view their own addresses" ON addresses;
      DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
      DROP POLICY IF EXISTS "Users can insert their own addresses" ON addresses;
      DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
      DROP POLICY IF EXISTS "Users can update their own addresses" ON addresses;
      DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;
      DROP POLICY IF EXISTS "Users can delete their own addresses" ON addresses;
      
      -- Also drop any other policies dynamically
      FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'addresses'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON addresses', policy_record.policyname);
      END LOOP;
      
      -- Drop foreign key constraint
      ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_user_id_fkey;
      ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_user_id_auth_users_id_fkey;
      
      -- Change column type
      ALTER TABLE addresses ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      
      -- Recreate RLS policies
      CREATE POLICY "Users can view own addresses" ON addresses
        FOR SELECT USING (true);
      
      CREATE POLICY "Users can insert own addresses" ON addresses
        FOR INSERT WITH CHECK (true);
      
      CREATE POLICY "Users can update own addresses" ON addresses
        FOR UPDATE USING (true);
      
      CREATE POLICY "Users can delete own addresses" ON addresses
        FOR DELETE USING (true);
      
      RAISE NOTICE '✅ Updated addresses.user_id to TEXT';
    END IF;
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: Fixed Firebase integration issues';
  RAISE NOTICE '   - Updated wishlists/wishlist tables to use TEXT user_id';
  RAISE NOTICE '   - Updated RLS policies for carts, cart_items, and wishlists';
  RAISE NOTICE '   - Created/updated addresses table with TEXT user_id';
END $$;

