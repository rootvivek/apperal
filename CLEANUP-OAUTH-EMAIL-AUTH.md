    # Cleanup OAuth and Email Authentication Data

This guide explains how to remove all OAuth and email-based authentication data from your database while preserving phone-based authentication.

## ⚠️ WARNING

**This script will permanently delete:**
- All users who signed up via OAuth (Google, Facebook, etc.)
- All users who signed up via email/password
- All related data (profiles, addresses, carts, wishlists, reviews)
- OAuth identity records

**This script will preserve:**
- Users who signed up via phone OTP
- Order history (by default, can be enabled to delete)

## 📋 Prerequisites

1. **Backup your database** before running this script
2. Ensure you have admin access to your Supabase project
3. Review the script to understand what will be deleted

## 🚀 How to Run

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the `cleanup-oauth-email-auth.sql` file
4. Copy and paste the entire script
5. Review the script carefully
6. Click **Run** to execute

### Option 2: Supabase CLI

```bash
supabase db execute --file cleanup-oauth-email-auth.sql
```

## 📊 What Gets Deleted

### 1. OAuth Users
- Users who authenticated with:
  - Google
  - Facebook
  - GitHub
  - Twitter
  - Apple
  - Azure
  - LinkedIn
  - Bitbucket
  - Discord
  - Twitch

### 2. Email/Password Users
- Users who signed up with email and password (no phone number)

### 3. Related Data (Cascade Delete)
- User profiles
- Addresses
- Cart items
- Carts
- Wishlists
- Reviews
- Orders (optional, commented out by default)

### 4. OAuth Identities
- All OAuth identity records from `auth.identities` table

## ✅ Verification

After running the script, use the verification queries at the end of the script to:

1. **Check remaining users** - Should only show phone-based users
2. **Count by authentication method** - Should only show "Phone OTP"
3. **Check OAuth identities** - Should be empty

## 🔄 Rollback

If you need to rollback:

1. Restore from your database backup
2. Or manually restore specific users if you have their data

## 📝 Notes

- **Order History**: By default, orders are preserved even if the user is deleted. Uncomment the order deletion section if you want to remove orders from deleted users.
- **Phone Users**: All users with phone numbers will be preserved
- **Metadata Cleanup**: OAuth metadata is cleaned from remaining user records

## 🎯 Expected Result

After cleanup:
- ✅ Only phone-based users remain
- ✅ No OAuth identities in database
- ✅ No email-only users
- ✅ All related data cleaned up
- ✅ Database ready for phone-only authentication

## ⚡ Quick Cleanup (Less Destructive)

If you want to keep user records but just clean up OAuth metadata:

```sql
-- Only clean metadata, don't delete users
UPDATE auth.users
SET 
  raw_user_meta_data = raw_user_meta_data - 'provider' - 'providers',
  raw_app_meta_data = raw_app_meta_data - 'provider' - 'providers'
WHERE 
  raw_user_meta_data->>'provider' IS NOT NULL
  OR raw_app_meta_data->>'provider' IS NOT NULL;
```

This will preserve user accounts but remove OAuth provider information.

