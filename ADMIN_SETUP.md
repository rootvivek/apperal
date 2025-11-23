# Admin Panel Setup Guide

## Simple Admin Access Setup

Admin access is controlled through the **`user_profiles` table** in Supabase. This works perfectly with Firebase Phone Authentication!

### How It Works

The system checks if `user_profiles.is_admin === true` for the logged-in user. Simple and direct!

### First: Add the Column

Run this SQL migration in your Supabase SQL Editor:

```sql
-- Add is_admin column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin) WHERE is_admin = true;
```

### Setting Up Admin Access

#### Method 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor** > **user_profiles**
3. Find the user you want to make admin (search by phone number or name)
4. Click on the row to edit
5. Set the **is_admin** column to `true`
6. Save the changes
7. The user needs to **log out and log back in** for changes to take effect

#### Method 2: Using SQL (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
-- Grant admin access (replace phone number with actual user phone)
UPDATE user_profiles 
SET is_admin = true
WHERE phone = '+918881765192';

-- Or by user ID:
UPDATE user_profiles 
SET is_admin = true
WHERE id = 'USER_ID_HERE';
```

To find your user ID:
```sql
SELECT id, phone, full_name, is_admin 
FROM user_profiles 
WHERE phone = '+918881765192';
```

#### Method 3: Using Admin API (From another admin account)

If you already have an admin account, you can use the API endpoint:

```bash
POST /api/admin/set-admin
{
  "userId": "user-uuid-here",
  "isAdmin": true
}
```

### Removing Admin Access

#### Via Supabase Dashboard:
1. Go to Table Editor > user_profiles
2. Find the user
3. Set `is_admin` column to `false`

#### Via SQL:
```sql
UPDATE user_profiles 
SET is_admin = false
WHERE phone = '+918881765192';
```

### Verifying Admin Status

Check if a user is admin:

```sql
SELECT id, phone, full_name, is_admin 
FROM user_profiles 
WHERE phone = '+918881765192';
```

### Troubleshooting

**Admin link not showing?**
1. Make sure `is_admin = true` is set in `user_profiles` table
2. User must **log out and log back in** after the update
3. Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. Verify the user profile exists in the database

**Can't access admin panel?**
1. Check browser console for errors
2. Verify `user_profiles.is_admin = true` for your user
3. Try accessing `/admin` directly - if you see 404, the check is failing
4. Make sure the `is_admin` column exists in the table

**Environment Variables Needed:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for API routes)

### Benefits of This Approach

✅ **Simple**: Just set a boolean flag in the database  
✅ **Works with Firebase**: Perfect for phone authentication  
✅ **Direct**: No complex matching logic  
✅ **Flexible**: Easy to grant/revoke admin access  
✅ **Database-driven**: All admin status in one place

