# Deploy to Vercel - Step by Step Guide

## ✅ Step 1: Code is Already Committed and Pushed
Your code has been successfully committed and pushed to GitHub: `https://github.com/YussefShell/invesco.git`

## 🚀 Step 2: Deploy via Vercel Dashboard (Easiest Method)

### Option A: GitHub Integration (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com
   - Sign up or log in with your GitHub account

2. **Import Your Repository**
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Choose your repository: `YussefShell/invesco`
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js** (should auto-detect)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

4. **Environment Variables** (Add these if needed)
   - You can add environment variables in the Vercel dashboard after deployment
   - The database connection will be auto-configured when you add Vercel Postgres

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (usually 2-3 minutes)

## 🗄️ Step 3: Setup Vercel Postgres Database

After your first deployment:

1. **Go to Your Project Dashboard**
   - Click on your project name in Vercel dashboard

2. **Add Postgres Database**
   - Click on the "Storage" tab
   - Click "Create Database"
   - Select "Postgres"
   - Choose a name (e.g., "invesco-db")
   - Select a region (choose closest to your users)
   - Click "Create"

3. **Database is Auto-Configured**
   - Vercel automatically adds these environment variables:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`
   - These are automatically available to your application

## 🔧 Step 4: Initialize Database Tables

After the database is created:

1. **Get Your Deployment URL**
   - From Vercel dashboard, copy your production URL
   - Example: `https://your-project.vercel.app`

2. **Initialize Database**
   - Open your browser or use curl:
   ```
   POST https://your-project.vercel.app/api/db/init
   ```
   - Or visit: `https://your-project.vercel.app/api/db/init` in your browser
   - This will create all necessary tables

3. **Verify Database**
   - Check health endpoint: `https://your-project.vercel.app/api/health`
   - Should show database as "connected"

## ✅ Step 5: Verify Deployment

1. **Visit Your App**
   - Go to your Vercel deployment URL
   - Example: `https://your-project.vercel.app`

2. **Check Features**
   - Dashboard loads correctly
   - Database fallback banner should NOT appear (if database is working)
   - All features work as expected

## 🔄 Future Deployments

Once connected via GitHub:
- Every push to `main` branch automatically triggers a new deployment
- No manual steps needed!

## 📝 Alternative: CLI Deployment

If you prefer CLI:

1. **Login to Vercel** (run in terminal):
   ```bash
   npx vercel@latest login
   ```

2. **Deploy**:
   ```bash
   npx vercel@latest --prod
   ```

3. **Follow Steps 3-4 above** for database setup

---

## 🆘 Troubleshooting

### Database Not Working?
- Check environment variables in Vercel dashboard
- Verify database was created in Storage tab
- Re-run initialization: `POST /api/db/init`

### Build Fails?
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Check Node.js version (should be 18+)

### Need Help?
- Vercel Docs: https://vercel.com/docs
- Check deployment logs in Vercel dashboard

