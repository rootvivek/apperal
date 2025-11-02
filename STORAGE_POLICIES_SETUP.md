# Storage Policies Setup Guide

## Problem
Getting error: "new row violates row-level security policy" when uploading images.

## Solution

### Option 1: Configure Storage Policies in Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → **Storage**
2. Click on each bucket (`category-images`, `subcategory-images`, `product-images`)
3. For each bucket, go to **Policies** tab
4. Click **New Policy**
5. Add these policies:

#### For category-images bucket:

**Policy 1: Allow authenticated upload**
- Name: `Allow authenticated upload`
- Command: `INSERT`
- Target roles: `authenticated`
- Policy definition: `true`

**Policy 2: Allow authenticated update**
- Name: `Allow authenticated update`
- Command: `UPDATE`
- Target roles: `authenticated`
- Policy definition: `true`

**Policy 3: Allow authenticated delete**
- Name: `Allow authenticated delete`
- Command: `DELETE`
- Target roles: `authenticated`
- Policy definition: `true`

**Policy 4: Allow public view**
- Name: `Allow public view`
- Command: `SELECT`
- Target roles: `public`
- Policy definition: `true`

Repeat these policies for:
- `subcategory-images` bucket
- `product-images` bucket

### Option 2: Run SQL Script

1. Open Supabase Dashboard → **SQL Editor**
2. Copy and paste the contents of `fix-storage-policies.sql`
3. Click **Run**

## Alternative: Use Public Access (Less Secure)

If the above doesn't work, you can make the buckets public:

1. Go to **Storage** → **Settings**
2. For each bucket, toggle **Public bucket** to ON
3. This allows anyone to upload/download files

⚠️ **Warning**: Only do this if you don't mind public access to your storage.

## Verify Setup

After setting up policies, try uploading an image again. The error should be resolved.

## Troubleshooting

### Still getting errors?
- Make sure you're logged in as an admin user
- Check that RLS is enabled on storage buckets
- Verify policies are correctly configured
- Try logging out and logging back in to refresh permissions

