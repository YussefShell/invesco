# Comprehensive Test Script for Windows PowerShell
# Runs all tests to catch errors automatically

$ErrorActionPreference = "Stop"

Write-Host "🧪 Running Comprehensive Test Suite..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Build verification
Write-Host "📦 Step 1: Verifying build..." -ForegroundColor Yellow
try {
    npm run test:build
    if ($LASTEXITCODE -ne 0) {
        throw "Build verification failed"
    }
} catch {
    Write-Host "❌ Build verification failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Unit tests
Write-Host ""
Write-Host "🔬 Step 2: Running unit tests..." -ForegroundColor Yellow
try {
    npm test
    if ($LASTEXITCODE -ne 0) {
        throw "Unit tests failed"
    }
} catch {
    Write-Host "❌ Unit tests failed!" -ForegroundColor Red
    exit 1
}

# Step 3: E2E tests
Write-Host ""
Write-Host "🌐 Step 3: Running E2E tests..." -ForegroundColor Yellow
try {
    npm run test:e2e
    if ($LASTEXITCODE -ne 0) {
        throw "E2E tests failed"
    }
} catch {
    Write-Host "❌ E2E tests failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All tests passed! No errors detected." -ForegroundColor Green
Write-Host "🎉 Your application is ready to use." -ForegroundColor Green

