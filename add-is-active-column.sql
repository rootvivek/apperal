-- Add is_active column to user_profiles table for deactivation functionality
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster queries filtering active users
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- Add comment to column
COMMENT ON COLUMN user_profiles.is_active IS 'Boolean flag indicating if user account is active. false means user is deactivated.';

-- Ensure all existing users are marked as active by default
UPDATE user_profiles SET is_active = true WHERE is_active IS NULL;

-- Add NOT NULL constraint after setting default values
ALTER TABLE user_profiles 
ALTER COLUMN is_active SET NOT NULL;