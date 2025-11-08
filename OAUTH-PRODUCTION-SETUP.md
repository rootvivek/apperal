# Google OAuth Production Setup Guide

If Google OAuth works on localhost but not in production, follow these steps:

## 1. Supabase Configuration

### Site URL Configuration
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Set **Site URL** to your production domain:
   ```
   https://your-production-domain.com
   ```
   (Replace with your actual production domain)

### Redirect URLs
In the **Redirect URLs** section, add both:
- `http://localhost:3000/auth/callback` (for local development)
- `https://your-production-domain.com/auth/callback` (for production)

## 2. Google Cloud Console Configuration

### Authorized Redirect URIs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID (the one you're using)
4. Click **Edit**
5. Under **Authorized redirect URIs**, add:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
   Replace `[YOUR-PROJECT-REF]` with your Supabase project reference ID (e.g., `ugzyijiuhchxbuiooclv`)

   **Important**: This is the Supabase callback URL, NOT your app's callback URL. Supabase handles the OAuth flow and then redirects to your app.

### Authorized JavaScript Origins
Add your production domain:
```
https://your-production-domain.com
```

## 3. Verify Environment Variables

Make sure your production environment has these variables set:
```
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 4. Common Issues

### Issue: "redirect_uri_mismatch" error
**Solution**: 
- Ensure the Supabase callback URL (`https://[PROJECT].supabase.co/auth/v1/callback`) is added in Google Cloud Console
- Check that your Site URL in Supabase matches your production domain

### Issue: "Access blocked: Apperal's request is invalid"
**Solution**:
- Check that your Google OAuth Client ID is correct
- Verify the redirect URI in Google Cloud Console matches exactly: `https://[PROJECT].supabase.co/auth/v1/callback`
- Make sure there are no extra spaces or trailing slashes

### Issue: OAuth works but redirects to wrong page
**Solution**:
- Check that the Redirect URLs in Supabase include your production callback URL
- Verify the `redirectTo` parameter in the code is correct (should be `${window.location.origin}/auth/callback`)

## 5. Testing

After making changes:
1. Clear your browser cache
2. Try signing in with Google on production
3. Check browser console for any errors
4. Check Supabase logs (Dashboard → Logs → Auth Logs)

## 6. Quick Checklist

- [ ] Site URL set in Supabase to production domain
- [ ] Redirect URLs include both localhost and production
- [ ] Google Cloud Console has Supabase callback URL: `https://[PROJECT].supabase.co/auth/v1/callback`
- [ ] Google Cloud Console has production domain in JavaScript origins
- [ ] Environment variables are set correctly in production
- [ ] Google OAuth is enabled in Supabase (Authentication → Providers → Google)

## Note

The redirect flow works like this:
1. User clicks "Sign in with Google"
2. App redirects to Google OAuth
3. Google redirects to Supabase: `https://[PROJECT].supabase.co/auth/v1/callback`
4. Supabase processes the OAuth and redirects to your app: `https://your-domain.com/auth/callback`
5. Your app's `/auth/callback` page handles the final authentication

Both URLs (Supabase callback and your app callback) need to be properly configured.


