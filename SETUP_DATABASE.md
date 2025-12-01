# Setup Vercel Postgres Database - Quick Guide

## ✅ Your Deployment is Live!
- **Production URL**: https://invesco-ten.vercel.app
- **Deployment URL**: https://invesco-nfqrfzbm6-youssef-alchalls-projects.vercel.app

## 🗄️ Step 1: Create Postgres Database in Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click on your project: **invesco**

2. **Navigate to Storage**
   - Click on the **"Storage"** tab in your project dashboard
   - Or go directly to: https://vercel.com/dashboard → Your Project → Storage

3. **Create Postgres Database**
   - Click **"Create Database"** button
   - Select **"Postgres"**
   - Database Name: `invesco-db` (or any name you prefer)
   - Region: Choose closest to your users (e.g., `us-east-1`, `eu-west-1`)
   - Click **"Create"**

4. **Wait for Database Creation**
   - This takes about 1-2 minutes
   - Vercel will automatically:
     - Create the database
     - Add environment variables to your project
     - Link the database to your deployment

## 🔧 Step 2: Initialize Database Tables

After the database is created, initialize the tables:

### Option A: Via Browser (Easiest)
1. Visit: https://invesco-ten.vercel.app/api/db/init
2. You should see: `{"success":true,"message":"Database initialized successfully"}`

### Option B: Via Terminal (curl)
```bash
curl -X POST https://invesco-ten.vercel.app/api/db/init
```

### Option C: Via Browser Developer Tools
1. Open: https://invesco-ten.vercel.app
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Run:
```javascript
fetch('/api/db/init', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

## ✅ Step 3: Verify Database is Working

1. **Check Health Endpoint**
   - Visit: https://invesco-ten.vercel.app/api/health
   - Should show database status as "connected"

2. **Check Your App**
   - Visit: https://invesco-ten.vercel.app
   - The database fallback banner should NOT appear
   - All features should work with database persistence

## 📋 What Gets Created

The initialization creates these tables:
- `fix_messages` - FIX protocol audit trail
- `audit_log_entries` - System audit logs
- `notifications` - Notification history
- `breach_events` - Regulatory breach events
- `holding_snapshots` - Historical holding data

## 🔄 Automatic Redeployment

After creating the database:
- Vercel automatically redeploys your app with the new environment variables
- Wait for the redeployment to complete (check the Deployments tab)
- Then initialize the database (Step 2)

## 🆘 Troubleshooting

### Database Creation Fails?
- Check you're on a paid Vercel plan (Postgres requires Hobby plan or higher)
- Free tier: Use external database (Supabase, Neon) and add connection string

### Initialization Fails?
- Wait for automatic redeployment after database creation
- Check environment variables are set in Vercel dashboard
- Verify database is in "Ready" status in Storage tab

### Need External Database?
If you prefer external database (Supabase/Neon):
1. Create database at supabase.com or neon.tech
2. Get connection string
3. Add to Vercel: Settings → Environment Variables → `POSTGRES_URL`
4. Redeploy

---

**Your app is live! Just need to add the database now.** 🚀

