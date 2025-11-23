-- Remove user_number column from user_profiles table
-- This column is being replaced with is_admin column

ALTER TABLE user_profiles 
DROP COLUMN IF EXISTS user_number;

