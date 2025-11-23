-- Add is_admin column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin) WHERE is_admin = true;

-- Optional: Set a specific user as admin (replace 'USER_ID_HERE' with actual user ID)
-- UPDATE user_profiles SET is_admin = true WHERE id = 'USER_ID_HERE';

