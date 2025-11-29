# Deployment Guide - Vercel

This guide will help you deploy your Invesco Regulatory Risk Management System to Vercel so you can share it with your interviewer.

## Quick Deploy (Recommended)

### Option 1: Deploy via Vercel CLI (Fastest)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy your project**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No**
   - What's your project's name? (Press Enter for default or enter a custom name)
   - In which directory is your code located? **./** (Press Enter)
   - Want to override the settings? **No**

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

5. **Your app will be live at**: `https://your-project-name.vercel.app`

### Option 2: Deploy via Vercel Dashboard (Easiest)

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign up/login

3. **Click "Add New Project"**

4. **Import your GitHub repository**

5. **Configure the project**:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: **./** (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

6. **Click "Deploy"**

7. **Your app will be live in 2-3 minutes!**

## Environment Variables (Optional)

Since your app uses **Mock data by default**, you don't need any environment variables for the interview demo. However, if you want to configure production data sources later:

1. Go to your project on Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add any of these (if needed):
   - `MARKET_DATA_BASE_URL`
   - `MARKET_DATA_API_KEY`
   - `REG_CONFIG_BASE_URL`
   - `REG_CONFIG_API_KEY`
   - `NEXT_PUBLIC_WS_BASE_URL`
   - `NEXT_PUBLIC_WS_AUTH_TOKEN`
   - Tableau variables (if using Tableau Server/Cloud)

## Post-Deployment

After deployment:

1. **Test your live URL** - Make sure everything works
2. **Share the URL** with your interviewer
3. **Note**: The app will use Mock data by default, which is perfect for demos

## Troubleshooting

### Build Errors

If you encounter build errors:
- Make sure all dependencies are in `package.json`
- Check that `npm run build` works locally first
- Review build logs in Vercel dashboard

### Runtime Errors

- Check the Vercel function logs
- Ensure all API routes are properly configured
- Verify environment variables if using production data sources

## Alternative Deployment Options

If you prefer other platforms:

### Netlify
- Similar to Vercel, supports Next.js out of the box
- Connect GitHub repo and deploy

### Railway
- Good for full-stack apps
- Supports Next.js with minimal configuration

### Render
- Free tier available
- Good for Next.js applications

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment


