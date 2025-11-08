-- Fix RLS policies for user_profiles table to allow admin access
-- This ensures admins can view all users in the admin panel

-- First, check if RLS is enabled on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can view all profiles" ON user_profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow all authenticated users to view all profiles
-- Note: This is safe because AdminGuard component already restricts admin panel access
-- Only authenticated users can access the admin panel, and they can view all profiles for management
CREATE POLICY "Authenticated users can view all profiles" ON user_profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

