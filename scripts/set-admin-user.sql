-- Script to set a user as admin in Supabase
-- For Firebase Phone Authentication - admin status is stored in user_profiles table

-- Method 1: Using SQL (Recommended)
-- Replace 'USER_ID_HERE' with the actual user ID from user_profiles table

-- Grant admin access:
UPDATE user_profiles 
SET is_admin = true
WHERE id = 'USER_ID_HERE';

-- Remove admin access:
-- UPDATE user_profiles 
-- SET is_admin = false
-- WHERE id = 'USER_ID_HERE';

-- To find user ID by phone number:
-- SELECT id, phone, full_name, is_admin 
-- FROM user_profiles 
-- WHERE phone = '+918881765192';

-- To check if user is admin:
-- SELECT id, phone, full_name, is_admin 
-- FROM user_profiles 
-- WHERE id = 'USER_ID_HERE';

-- Method 2: Using Admin API (from another admin account)
-- POST /api/admin/set-admin
-- {
--   "userId": "user-uuid-here",
--   "isAdmin": true
-- }

-- Method 3: Using Supabase Dashboard
-- Go to Supabase Dashboard > Table Editor > user_profiles
-- Find the user row and set is_admin column to true

