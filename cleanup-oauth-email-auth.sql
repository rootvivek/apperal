-- =============================================
-- Cleanup OAuth and Email Authentication Data
-- =============================================
-- This script removes OAuth and email-based authentication data
-- while preserving phone-based authentication (OTP)
-- 
-- WARNING: This will remove users who signed up via OAuth or email
-- Make sure to backup your database before running this script
-- =============================================

-- Step 1: Remove OAuth provider information from user metadata
-- This cleans up OAuth-related metadata but keeps the user records
UPDATE auth.users
SET 
  raw_user_meta_data = raw_user_meta_data - 'provider' - 'providers' - 'email_verified' - 'phone_verified',
  raw_app_meta_data = raw_app_meta_data - 'provider' - 'providers',
  email = NULL
WHERE 
  -- Users who authenticated via OAuth (have provider in metadata)
  raw_user_meta_data->>'provider' IS NOT NULL
  OR raw_app_meta_data->>'provider' IS NOT NULL
  -- Users who have email but no phone (email-based signup)
  OR (email IS NOT NULL AND phone IS NULL);

-- Step 2: Delete users who signed up via OAuth providers
-- This removes users who authenticated with Google, Facebook, etc.
DELETE FROM auth.users
WHERE 
  raw_user_meta_data->>'provider' IN ('google', 'facebook', 'github', 'twitter', 'apple', 'azure', 'linkedin', 'bitbucket', 'discord', 'twitch')
  OR raw_app_meta_data->>'provider' IN ('google', 'facebook', 'github', 'twitter', 'apple', 'azure', 'linkedin', 'bitbucket', 'discord', 'twitch');

-- Step 3: Delete users who signed up via email/password (no phone)
-- This removes users who only have email authentication
DELETE FROM auth.users
WHERE 
  email IS NOT NULL 
  AND phone IS NULL
  AND (raw_user_meta_data->>'provider' IS NULL OR raw_user_meta_data->>'provider' NOT IN ('phone', 'sms'));

-- Step 4: Clean up OAuth-related identities
-- Remove OAuth identity records from auth.identities table
DELETE FROM auth.identities
WHERE 
  provider IN ('google', 'facebook', 'github', 'twitter', 'apple', 'azure', 'linkedin', 'bitbucket', 'discord', 'twitch', 'email');

-- Step 5: Clean up user profiles for deleted users
-- This will automatically cascade delete due to foreign key constraints,
-- but we'll clean up any orphaned records
DELETE FROM public.user_profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 6: Clean up addresses for deleted users
DELETE FROM public.addresses
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 7: Clean up cart items for deleted users
DELETE FROM public.cart_items
WHERE cart_id IN (
  SELECT id FROM public.carts WHERE user_id NOT IN (SELECT id FROM auth.users)
);

-- Step 8: Clean up carts for deleted users
DELETE FROM public.carts
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 9: Clean up wishlists for deleted users
DELETE FROM public.wishlists
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 10: Clean up reviews for deleted users
DELETE FROM public.reviews
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 11: Clean up orders for deleted users (optional - comment out if you want to keep order history)
-- Uncomment the following if you want to delete orders from removed users:
-- DELETE FROM public.order_items
-- WHERE order_id IN (
--   SELECT id FROM public.orders WHERE user_id NOT IN (SELECT id FROM auth.users)
-- );
-- DELETE FROM public.orders
-- WHERE user_id NOT IN (SELECT id FROM auth.users);

-- =============================================
-- Verification Queries
-- =============================================

-- Check remaining users (should only have phone-based users)
SELECT 
  id,
  phone,
  email,
  raw_user_meta_data->>'provider' as provider,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- Count users by authentication method
SELECT 
  CASE 
    WHEN phone IS NOT NULL THEN 'Phone OTP'
    WHEN email IS NOT NULL THEN 'Email'
    WHEN raw_user_meta_data->>'provider' IS NOT NULL THEN 'OAuth: ' || raw_user_meta_data->>'provider'
    ELSE 'Unknown'
  END as auth_method,
  COUNT(*) as user_count
FROM auth.users
GROUP BY auth_method;

-- Check for any remaining OAuth identities
SELECT 
  provider,
  COUNT(*) as count
FROM auth.identities
GROUP BY provider;

