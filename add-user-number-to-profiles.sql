-- Add user_number field to user_profiles table for short user ID display
-- Format: USR-ID:123456

-- Add user_number column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS user_number VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_number ON user_profiles(user_number);

-- Function to generate unique short user number
CREATE OR REPLACE FUNCTION generate_unique_short_user_number()
RETURNS TEXT AS $$
DECLARE
  new_user_number TEXT;
  user_num TEXT;
  exists_check INTEGER;
  attempts INTEGER := 0;
BEGIN
  LOOP
    -- Generate a random number between 1000 and 999999 (4-6 digits)
    user_num := (1000 + floor(random() * 999000))::TEXT;
    new_user_number := 'USR-ID:' || user_num;
    
    -- Check if this user number already exists
    SELECT COUNT(*) INTO exists_check
    FROM user_profiles
    WHERE user_number = new_user_number;
    
    -- If unique, return it
    IF exists_check = 0 THEN
      RETURN new_user_number;
    END IF;
    
    -- Prevent infinite loop
    attempts := attempts + 1;
    IF attempts > 100 THEN
      -- Fallback: use timestamp-based number
      user_num := (extract(epoch from now())::bigint % 1000000)::TEXT;
      -- Ensure it's at least 4 digits
      user_num := LPAD(user_num, 6, '0');
      new_user_number := 'USR-ID:' || user_num;
      RETURN new_user_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update existing user_profiles with new short user numbers
DO $$
DECLARE
  profile_record RECORD;
  new_user_number TEXT;
BEGIN
  FOR profile_record IN 
    SELECT id 
    FROM user_profiles 
    WHERE user_number IS NULL
    ORDER BY created_at
  LOOP
    -- Generate unique short user number
    new_user_number := generate_unique_short_user_number();
    
    -- Update the profile
    UPDATE user_profiles
    SET user_number = new_user_number
    WHERE id = profile_record.id;
    
    RAISE NOTICE 'Updated profile % to user number %', profile_record.id, new_user_number;
  END LOOP;
END;
$$;

-- Note: If you have a handle_new_user function that inserts into profiles table,
-- you may need to update it separately. This script only updates user_profiles.
-- If you need to update profiles table as well, check if it exists and update accordingly.

-- Drop the temporary function
DROP FUNCTION IF EXISTS generate_unique_short_user_number();

