# Vercel Deployment Guide

This guide covers deploying the Invesco Regulatory Risk Management System to Vercel with all features enabled.

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **GitHub/GitLab/Bitbucket Repository**: Your code should be in a Git repository
3. **Environment Variables**: Prepare all required environment variables (see below)

## Quick Deployment

1. **Connect Repository to Vercel**:
   - Go to https://vercel.com/new
   - Import your Git repository
   - Vercel will auto-detect Next.js

2. **Set Environment Variables** (see "Environment Variables" section below)

3. **Add Vercel Postgres Database**:
   - In your Vercel project dashboard, go to Storage tab
   - Click "Create Database" → Select "Postgres"
   - Note: This automatically sets `POSTGRES_URL` environment variable

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

5. **Initialize Database**:
   - After first deployment, visit: `https://your-app.vercel.app/api/db/init`
   - This creates all required database tables

## Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

### Database (Auto-configured by Vercel Postgres)
- `POSTGRES_URL` - Automatically set when you add Vercel Postgres
- `DATABASE_ENABLED=true` - Optional, defaults to true if POSTGRES_URL exists

### Email Notifications (Resend)
```env
EMAIL_SERVICE=resend
EMAIL_SERVICE_API_KEY=re_your_api_key_here
EMAIL_FROM_ADDRESS=alerts@yourdomain.com
```

### SMS Notifications (Twilio)
```env
SMS_SERVICE=twilio
SMS_SERVICE_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMS_SERVICE_API_KEY=your_auth_token_here
SMS_FROM_NUMBER=+1234567890
```

### Push Notifications - APNS (iOS)
```env
PUSH_SERVICE=apns
APNS_KEY_ID=your_key_id
APNS_TEAM_ID=your_team_id
APNS_KEY_PATH=/path/to/key.p8
APNS_BUNDLE_ID=com.yourcompany.app
```

**Note**: For APNS on Vercel, you need to:
- Store the .p8 key file as a base64-encoded environment variable
- Or use a secure file storage service (AWS S3, etc.)
- Update `APNS_KEY_PATH` to read from environment variable

### Push Notifications - FCM (Android/Web)
```env
PUSH_SERVICE=fcm
FCM_SERVER_KEY=your_fcm_server_key
```

### Tableau Integration (Optional)
```env
NEXT_PUBLIC_TABLEAU_SERVER_URL=https://your-tableau-server.com
NEXT_PUBLIC_TABLEAU_SITE_ID=your-site-id
NEXT_PUBLIC_TABLEAU_USE_CONNECTED_APP=true
NEXT_PUBLIC_TABLEAU_CONNECTED_APP_CLIENT_ID=your-client-id
NEXT_PUBLIC_TABLEAU_CONNECTED_APP_SECRET_ID=your-secret-id
TABLEAU_CONNECTED_APP_SECRET_VALUE=your-secret-value
```

### Production Data Sources (Optional)
```env
REG_CONFIG_BASE_URL=https://your-regulatory-config-api.com
MARKET_DATA_BASE_URL=https://your-market-data-api.com
NEXT_PUBLIC_WS_BASE_URL=wss://your-websocket-gateway.com
```

## Step-by-Step Deployment

### 1. Initial Setup

```bash
# Clone your repository (if not already done)
git clone <your-repo-url>
cd InvescoProject2

# Install dependencies locally to verify
npm install

# Build locally to check for errors
npm run build
```

### 2. Create Vercel Project

1. Go to https://vercel.com/new
2. Import your Git repository
3. Framework Preset: **Next.js** (auto-detected)
4. Root Directory: `.` (or leave default)
5. Build Command: `npm run build` (default)
6. Output Directory: `.next` (default)
7. Install Command: `npm install` (default)

### 3. Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

Add all variables from the "Environment Variables" section above.

**Important Notes:**
- Add variables for **Production**, **Preview**, and **Development** environments as needed
- `NEXT_PUBLIC_*` variables are exposed to the browser
- Server-side only variables (like `TABLEAU_CONNECTED_APP_SECRET_VALUE`) are NOT exposed

### 4. Add Vercel Postgres Database

1. In Vercel Dashboard → Your Project → **Storage** tab
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Choose a name for your database
5. Select a region (closest to your users)
6. Click **"Create"**

**This automatically sets:**
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

### 5. Deploy

Click **"Deploy"** button or push to your main branch to trigger automatic deployment.

### 6. Initialize Database

After first deployment:

1. Visit: `https://your-app.vercel.app/api/db/init`
2. Or use curl:
   ```bash
   curl -X POST https://your-app.vercel.app/api/db/init
   ```
3. This creates all database tables and indexes

You can also call this endpoint from your application code on startup (optional).

### 7. Verify Deployment

1. **Health Check**: Visit `https://your-app.vercel.app/api/health`
   - Should return `status: "ok"` and `database.status: "connected"`

2. **Application**: Visit `https://your-app.vercel.app`
   - Should load the dashboard
   - Mock data source should work without configuration

3. **Database**: Check Vercel Dashboard → Storage → Your Database
   - Should show tables: `fix_messages`, `audit_log_entries`, `notifications`, etc.

## Post-Deployment Configuration

### Enable Features

1. **Database Persistence**:
   - Already enabled if `POSTGRES_URL` is set
   - Data will automatically persist to database

2. **Email/SMS Notifications**:
   - Add API keys (see Environment Variables above)
   - Test by triggering a breach alert

3. **Tableau Integration**:
   - Configure Tableau Server/Cloud credentials
   - Test by embedding a visualization

### Monitoring

- **Logs**: Vercel Dashboard → Your Project → **Logs** tab
- **Analytics**: Vercel Dashboard → Your Project → **Analytics** tab
- **Database**: Vercel Dashboard → Storage → Your Database → **Data** tab

## Troubleshooting

### Database Connection Issues

1. **Check Environment Variables**:
   - Ensure `POSTGRES_URL` is set (automatic with Vercel Postgres)
   - Verify `DATABASE_ENABLED` is not set to `"false"`

2. **Initialize Database**:
   - Visit `/api/db/init` to create tables
   - Check logs for errors

3. **Verify Connection**:
   - Visit `/api/health` - should show `database.status: "connected"`

### Build Failures

1. **Check Build Logs**: Vercel Dashboard → Deployments → Failed Deployment → Logs

2. **Common Issues**:
   - Missing environment variables
   - TypeScript errors
   - Missing dependencies

3. **Local Build Test**:
   ```bash
   npm run build
   ```

### Feature Not Working

1. **Check Environment Variables**: Ensure all required variables are set
2. **Check Logs**: Vercel Dashboard → Logs tab
3. **Test Locally**: Run `npm run dev` and test feature

### APNS Push Notifications

**Challenge**: APNS requires a .p8 key file, which is difficult to store as an environment variable.

**Solution Options**:

1. **Base64 Encode Key**:
   ```bash
   # Encode your .p8 file
   base64 -i path/to/key.p8 > key-base64.txt
   ```
   
   Then in Vercel:
   - Add `APNS_KEY_BASE64` environment variable with the base64 content
   - Update `app/api/notifications/send-push/route.ts` to decode it:
   ```typescript
   const keyContent = Buffer.from(process.env.APNS_KEY_BASE64 || '', 'base64').toString('utf-8');
   // Write to temp file or use in-memory
   ```

2. **Use AWS S3 or Similar**:
   - Store .p8 file in S3
   - Fetch at runtime using AWS SDK

3. **Use Vercel Blob Storage** (if available):
   - Store .p8 file in Vercel Blob
   - Fetch at runtime

## Environment-Specific Configuration

Vercel supports three environments:
- **Production**: Main deployment
- **Preview**: Every branch/pull request
- **Development**: Local development (via Vercel CLI)

Set environment variables for each environment as needed.

## Security Best Practices

1. **Never commit** `.env.local` files
2. **Use different API keys** for Production vs Development
3. **Rotate secrets** regularly
4. **Review access logs** periodically
5. **Enable 2FA** on Vercel account

## Performance Optimization

1. **Enable Edge Functions** for API routes (if applicable)
2. **Use ISR** (Incremental Static Regeneration) for static pages
3. **Monitor database queries** for optimization
4. **Use Vercel Analytics** to identify bottlenecks

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Add Vercel Postgres database
3. ✅ Configure environment variables
4. ✅ Initialize database tables
5. ✅ Test all features
6. ✅ Set up monitoring and alerts

## Support

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Vercel Postgres Docs**: https://vercel.com/docs/storage/vercel-postgres

---

**Ready to deploy?** Follow the "Quick Deployment" steps above! 🚀

