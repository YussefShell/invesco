# Automated Deployment Script
Write-Host "🚀 Starting Automated Deployment..." -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Vercel authentication..." -ForegroundColor Cyan
$vercelCheck = npx vercel@latest whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not authenticated with Vercel" -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Step 1: Login to Vercel" -ForegroundColor Yellow
    Write-Host "   This will open your browser..." -ForegroundColor Gray
    Write-Host ""
    
    # Try to login
    Start-Process "https://vercel.com/login"
    Write-Host "   Browser opened. After logging in, run:" -ForegroundColor Gray
    Write-Host "   npx vercel@latest login" -ForegroundColor White
    Write-Host ""
    
    $login = Read-Host "Press Enter after you've logged in, or type 'skip' to deploy via GitHub instead"
    
    if ($login -eq "skip") {
        Write-Host ""
        Write-Host "✅ GitHub Deployment Setup:" -ForegroundColor Green
        Write-Host "   1. Push to GitHub: git push origin main" -ForegroundColor Yellow
        Write-Host "   2. Go to https://vercel.com and import your repo" -ForegroundColor Yellow
        exit
    }
}

Write-Host ""
Write-Host "✅ Authenticated! Deploying..." -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "📦 Deploying to Vercel..." -ForegroundColor Cyan
npx vercel@latest --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🚀 Deploying to production..." -ForegroundColor Cyan
    npx vercel@latest --prod --yes
    
    Write-Host ""
    Write-Host "✅ Deployment complete!" -ForegroundColor Green
    Write-Host "   Your app is live! Check the URL above." -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "⚠️  Deployment needs authentication" -ForegroundColor Yellow
    Write-Host "   Run: npx vercel@latest login" -ForegroundColor White
    Write-Host "   Then: npx vercel@latest --prod" -ForegroundColor White
}

