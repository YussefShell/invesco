# Test Database Fallback Banner
Write-Host "=== Testing Database Fallback Banner ===" -ForegroundColor Cyan
Write-Host ""

# Wait for server to be ready
Write-Host "Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test 1: Health Endpoint
Write-Host "Test 1: Health Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 10
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "  Status: $($data.status)" -ForegroundColor Green
    Write-Host "  Database Enabled: $($data.database.enabled)" -ForegroundColor $(if ($data.database.enabled) { "Green" } else { "Yellow" })
    Write-Host "  Database Status: $($data.database.status)" -ForegroundColor $(if ($data.database.status -eq "connected") { "Green" } else { "Yellow" })
    Write-Host "  Using Fallback: $($data.database.usingFallback)" -ForegroundColor $(if ($data.database.usingFallback) { "Yellow" } else { "Green" })
    Write-Host "  Storage: $($data.database.storage)" -ForegroundColor Cyan
    
    if ($data.database.usingFallback) {
        Write-Host "  [OK] usingFallback is true (expected without database)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] usingFallback is false (database may be configured)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Could not reach health endpoint: $_" -ForegroundColor Red
    Write-Host "  Make sure the dev server is running: npm run dev" -ForegroundColor Yellow
}

Write-Host ""

# Test 2: Check if banner component exists
Write-Host "Test 2: Banner Component" -ForegroundColor Yellow
if (Test-Path "components/database-fallback-banner.tsx") {
    Write-Host "  [OK] Banner component exists" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Banner component missing" -ForegroundColor Red
}

Write-Host ""

# Test 3: Check if banner is imported in page
Write-Host "Test 3: Banner Integration" -ForegroundColor Yellow
$pageContent = Get-Content "app/page.tsx" -Raw
if ($pageContent -match "DatabaseFallbackBanner") {
    Write-Host "  [OK] Banner imported in page.tsx" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Banner not imported" -ForegroundColor Red
}

Write-Host ""

# Test 4: Check Alert component
Write-Host "Test 4: Alert Component" -ForegroundColor Yellow
if (Test-Path "components/ui/alert.tsx") {
    Write-Host "  [OK] Alert component exists" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Alert component missing" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To verify the banner visually:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "2. Look for yellow banner at top of main content" -ForegroundColor White
Write-Host "3. Banner should say 'Using Local Storage Fallback'" -ForegroundColor White
Write-Host ""

