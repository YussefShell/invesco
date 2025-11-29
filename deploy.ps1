# Quick Deployment Script for Vercel
# This script helps you deploy your Next.js app to Vercel

Write-Host "🚀 Starting Vercel Deployment..." -ForegroundColor Green

# Check if vercel is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host "`n📝 Step 1: You need to login to Vercel" -ForegroundColor Cyan
Write-Host "   This will open your browser for authentication" -ForegroundColor Gray
Write-Host "   Run: vercel login" -ForegroundColor Yellow
Write-Host ""

# Try to deploy
Write-Host "📝 Step 2: Deploying to Vercel..." -ForegroundColor Cyan
Write-Host "   Run: vercel" -ForegroundColor Yellow
Write-Host "   Then: vercel --prod" -ForegroundColor Yellow
Write-Host ""

Write-Host "✅ Your app will be live at: https://your-project.vercel.app" -ForegroundColor Green
Write-Host ""

Write-Host "💡 Alternative: Deploy via GitHub + Vercel Dashboard" -ForegroundColor Cyan
Write-Host "   1. Push to GitHub: git push origin main" -ForegroundColor Yellow
Write-Host "   2. Go to https://vercel.com and import your repo" -ForegroundColor Yellow

