# Deployment Guide for Apperal

## Build Status
✅ **Build completed successfully** - The `.next` directory has been generated and contains all compiled assets.

## Option 1: Deploy to Vercel (Recommended)

### Quick Deploy
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to link your project and deploy.

### Git-Based Deploy (Continuous Deployment)
1. Push your code to GitHub/GitLab/Bitbucket
2. Import your repository at [vercel.com](https://vercel.com)
3. Vercel will automatically detect Next.js and configure the build
4. Add your environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Manual Deploy
```bash
npm i -g vercel
vercel --prod
```

## Option 2: Deploy to Netlify

1. Install Netlify CLI:
   ```bash
   npm i -g netlify-cli
   ```

2. Build and deploy:
   ```bash
   npm run build
   netlify deploy --prod
   ```

Or use the Netlify Dashboard:
- Build command: `npm run build`
- Publish directory: `.next`

## Option 3: Deploy to Traditional Hosting (cPanel, Hostinger, etc.)

### Using Standalone Export
Update your `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
```

Then:
```bash
npm run build
# The `out` folder will contain your static site
# Upload the entire `out` folder to your hosting provider
```

## Option 4: Self-Hosted Server

### Using PM2
```bash
# Install PM2
npm i -g pm2

# Start production server
pm2 start npm --name "apperal" -- start

# Make PM2 restart on reboot
pm2 startup
pm2 save
```

### Using Docker
Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t apperal .
docker run -p 3000:3000 apperal
```

## Environment Variables Required

Ensure these are set in your hosting platform:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing Locally Before Deploy

```bash
# Build for production
npm run build

# Start production server locally
npm start
```

Visit `http://localhost:3000` to test.

## Notes
- The build outputs are in the `.next` directory
- For Vercel/Netlify, no additional configuration needed
- For static hosting, you may need to enable static export mode
- Ensure all Supabase configurations are correct in your hosting environment

