# Production Deployment Checklist

## Critical Issues to Fix

### 1. **RLS Policies Not Applied** ⚠️ CRITICAL
**Problem**: Status toggle buttons not working in admin panel
**Solution**: 
- Go to Supabase Dashboard → SQL Editor
- Run `admin-rls-policies.sql` file
- Verify policies are created (check the SELECT query at the end)

**How to verify**:
```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('categories', 'subcategories', 'products', 'product_images')
ORDER BY tablename, policyname;
```

### 2. **Environment Variables** ⚠️ CRITICAL
**Check these are set in production (Netlify/Vercel)**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `NEXT_PUBLIC_ADMIN_PHONE` (should match admin user's phone)
- `ADMIN_PHONE` (should match admin user's phone)

### 3. **Search Functionality** ✅ FIXED
**Problem**: Search bar not working - 301 redirect error
**Root Cause**: Netlify configuration issue - catch-all redirect interfering with Next.js routing
**Fix Applied**:
- Removed catch-all redirect from `netlify.toml`
- Installed `@netlify/plugin-nextjs` plugin
- Removed `output: 'standalone'` from `next.config.js` (doesn't work well with Netlify)
- Updated `netlify.toml` to use Netlify Next.js plugin
- Fixed middleware to preserve query parameters in HTTPS redirects

**Additional checks**:
- RLS policies must allow viewing active items
- Supabase client must be initialized properly

### 3.5. **Checkout Route 301 Redirect** ✅ FIXED
**Problem**: `/checkout?direct=true&productId=...` getting 301 redirect, losing query parameters
**Root Cause**: Middleware HTTPS redirect not preserving query parameters
**Fix Applied**:
- Updated middleware to use `request.nextUrl.clone()` to preserve query parameters
- Query parameters now preserved in HTTPS redirects

**Note**: If you still see 301 redirects, it might be browser cache. Clear cache or do hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### 4. **Product Navigation**
**Problem**: Product detail page - other products not clicking
**Possible causes**:
- ProductCard onClick handler not working
- Router navigation issues
- Missing href in Link components

### 5. **API Routes**
**Problem**: Many things not working
**Check**:
- API routes are server-side and use service role (bypasses RLS)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in production
- Check API route logs in production

## Step-by-Step Production Fix

### Step 1: Apply RLS Policies
1. Login to Supabase Dashboard
2. Go to SQL Editor
3. Copy entire `admin-rls-policies.sql` file
4. Paste and Run
5. Verify no errors
6. Check policies were created

### Step 2: Verify Environment Variables
In your hosting platform (Netlify/Vercel):
1. Go to Site Settings → Environment Variables
2. Verify all required variables are set
3. Make sure `NEXT_PUBLIC_*` variables are available at build time
4. Redeploy after adding/changing variables

### Step 3: Test Admin Panel
1. Login as admin (phone must match `NEXT_PUBLIC_ADMIN_PHONE`)
2. Try toggling product/category status
3. Should work if RLS policies are applied

### Step 4: Test Search
1. Type in search bar
2. Should navigate to `/search?q=...`
3. Should show results if RLS allows viewing active items

### Step 5: Test Product Navigation
1. Click on any product card
2. Should navigate to `/product/[slug]`
3. Check browser console for errors

## Common Production Issues

### Issue: "Permission denied" errors
**Cause**: RLS policies not applied or user not authenticated
**Fix**: Apply RLS policies SQL file

### Issue: "Service role key not set"
**Cause**: `SUPABASE_SERVICE_ROLE_KEY` missing in production
**Fix**: Add environment variable in hosting platform

### Issue: "Admin access denied"
**Cause**: User's phone doesn't match `NEXT_PUBLIC_ADMIN_PHONE`
**Fix**: Update phone in `user_profiles` table or update env variable

### Issue: Search returns no results
**Cause**: RLS policies blocking or `is_active = true` filter too strict
**Fix**: Verify "Users can view active..." policies exist

### Issue: Product clicks not working
**Cause**: JavaScript errors or router issues
**Fix**: Check browser console, verify ProductCard has onClick handler

## Debugging Commands

### Check RLS Policies
```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('categories', 'subcategories', 'products', 'product_images')
ORDER BY tablename, policyname;
```

### Check Admin Phone Config
```sql
SELECT * FROM app_config WHERE key = 'admin_phone';
```

### Check User Phone
```sql
SELECT id, phone FROM user_profiles WHERE id = auth.uid();
```

### Test Admin Function
```sql
SELECT check_admin_by_phone();
```

## Quick Fix Script

If you need to quickly check what's wrong:

1. **Check RLS Policies**:
   - Run the SELECT query above in Supabase SQL Editor
   - Should see 2 policies per table (Users can view, Admins have full access)

2. **Check Environment Variables**:
   - In production, add a test page that logs env vars (remove after testing!)
   - Or check hosting platform's environment variable settings

3. **Check Browser Console**:
   - Open browser DevTools
   - Look for errors in Console tab
   - Check Network tab for failed API calls

4. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Look for RLS policy violations or errors

