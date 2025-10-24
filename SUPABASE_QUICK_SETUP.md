# Supabase Setup Instructions

## Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Sign up/Login to your account
3. Click "New Project"
4. Fill in project details:
   - Name: Apperal
   - Database Password: Create a strong password (save this!)
   - Region: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for provisioning

## Step 2: Get Your API Keys
1. In your Supabase dashboard, go to Settings → API
2. Copy these values:
   - Project URL (looks like: https://abcdefgh.supabase.co)
   - anon/public key (starts with eyJ...)
   - service_role key (starts with eyJ...)

## Step 3: Update .env.local File
Replace the content of your .env.local file with:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here

# Optional: For server-side operations
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
```

## Step 4: Set Up Database Schema
1. In Supabase dashboard, go to SQL Editor
2. Click "New Query"
3. Copy the entire content from supabase-schema.sql file
4. Paste it into the SQL editor
5. Click "Run" to execute

## Step 5: Restart Development Server
Run: npm run dev

## Step 6: Test Authentication
1. Go to http://localhost:3000/signup
2. Create a test account
3. Check your email for verification
4. Try logging in at http://localhost:3000/login

## What You'll Get
- ✅ Real user authentication (email + social login)
- ✅ Persistent shopping carts
- ✅ Order management
- ✅ User profiles and addresses
- ✅ Product reviews and wishlists
- ✅ Admin dashboard (via Supabase)
