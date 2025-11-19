-- Migration: Remove email NOT NULL constraint from user_profiles
-- This allows the table to work without email, using phone number for relations instead

-- Step 1: Make email column nullable (if it exists and is NOT NULL)
DO $$ 
BEGIN
  -- Check if email column exists and has NOT NULL constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'email'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;
    RAISE NOTICE 'Removed NOT NULL constraint from email column';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'email'
  ) THEN
    RAISE NOTICE 'Email column already nullable';
  ELSE
    RAISE NOTICE 'Email column does not exist';
  END IF;
END $$;

-- Step 2: Ensure phone column exists and is properly indexed for relations
DO $$ 
BEGIN
  -- Check if phone column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone VARCHAR(20);
    RAISE NOTICE 'Added phone column';
  ELSE
    RAISE NOTICE 'Phone column already exists';
  END IF;
END $$;

-- Step 3: Clean up duplicate phone numbers before creating unique index
-- Keep the most recent non-deleted profile for each phone number
DO $$ 
BEGIN
  -- Delete duplicate phone numbers, keeping only the most recent non-deleted one
  DELETE FROM user_profiles
  WHERE id IN (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY phone 
               ORDER BY 
                 CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END,
                 COALESCE(updated_at, created_at) DESC
             ) as rn
      FROM user_profiles
      WHERE phone IS NOT NULL
    ) duplicates
    WHERE rn > 1
  );
  
  RAISE NOTICE 'Cleaned up duplicate phone numbers';
END $$;

-- Step 4: Create unique index on phone for relation checks (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_phone_key 
ON user_profiles(phone) 
WHERE phone IS NOT NULL AND deleted_at IS NULL;

-- Step 5: Add comment to document the change
COMMENT ON COLUMN user_profiles.phone IS 'Primary identifier for user relations. Used instead of email.';
COMMENT ON COLUMN user_profiles.email IS 'Deprecated: Email is no longer required. Use phone for relations.';

