-- Add deleted_at column to user_profiles table for soft delete functionality
-- This prevents auto-recreation of deleted user profiles

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries filtering deleted users
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at) WHERE deleted_at IS NULL;

-- Add comment to column
COMMENT ON COLUMN user_profiles.deleted_at IS 'Timestamp when user was deleted. NULL means user is active.';

