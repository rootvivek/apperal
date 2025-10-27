# Netlify Deployment Guide for Apperal

This guide will help you deploy your Next.js application to Netlify.

## Prerequisites

1. A Netlify account (sign up at https://netlify.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Your Supabase environment variables

## Deployment Steps

### Option 1: Deploy via Netlify Dashboard (Recommended)

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Choose your Git provider (GitHub, GitLab, or Bitbucket)
   - Select your `Apperal` repository
   - Click "Deploy site"

3. **Configure Build Settings**
   Netlify should auto-detect Next.js, but verify:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: `18`

4. **Add Environment Variables**
   Go to Site settings → Environment variables and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

5. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically build and deploy your app
   - Wait for the build to complete

### Option 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize the site**
   ```bash
   netlify init
   ```

4. **Set environment variables**
   ```bash
   netlify env:set NEXT_PUBLIC_SUPABASE_URL "your_supabase_url"
   netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your_supabase_anon_key"
   netlify env:set SUPABASE_SERVICE_ROLE_KEY "your_service_role_key"
   ```

5. **Deploy**
   ```bash
   netlify deploy --prod
   ```

## Post-Deployment Steps

1. **Verify Environment Variables**
   - Go to Site settings → Environment variables
   - Ensure all Supabase variables are set correctly

2. **Test the Application**
   - Visit your Netlify URL
   - Test all functionality (login, products, cart, etc.)

3. **Custom Domain (Optional)**
   - Go to Domain settings
   - Add your custom domain
   - Configure DNS settings

## Important Notes

- The app uses `output: 'standalone'` for optimized builds
- Image optimization is disabled for Netlify compatibility
- All images are served directly from Supabase Storage
- Make sure your Supabase project allows the Netlify domain in RLS policies

## Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Ensure all environment variables are set
- Verify Node version is 18 or higher

### Images Not Loading
- Check Supabase Storage bucket permissions
- Verify image URLs are public or accessible
- Check browser console for CORS errors

### Authentication Issues
- Verify Supabase redirect URLs include your Netlify domain
- Check environment variables are correct
- Ensure Supabase RLS policies allow your application

## Support

For issues specific to:
- **Netlify**: Check https://docs.netlify.com
- **Next.js**: Check https://nextjs.org/docs
- **Supabase**: Check https://supabase.com/docs

