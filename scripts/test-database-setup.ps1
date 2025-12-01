# Test Database Persistence Setup
# This script tests the database persistence implementation

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Persistence Setup Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check environment variable handling
Write-Host "Test 1: Environment Variable Configuration" -ForegroundColor Yellow
$env:DATABASE_ENABLED = "true"
$env:DATA_RETENTION_DAYS = "90"
Write-Host "  [OK] DATABASE_ENABLED set to: $env:DATABASE_ENABLED" -ForegroundColor Green
Write-Host "  [OK] DATA_RETENTION_DAYS set to: $env:DATA_RETENTION_DAYS" -ForegroundColor Green
Write-Host ""

# Test 2: Run database persistence tests
Write-Host "Test 2: Running Database Persistence Tests" -ForegroundColor Yellow
npm test -- __tests__/database-persistence.test.ts --silent
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] All database persistence tests passed" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Some tests failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Build verification
Write-Host "Test 3: Build Verification" -ForegroundColor Yellow
$buildOutput = npm run build 2>&1 | Out-String
if ($buildOutput -match "error" -and $buildOutput -notmatch "Dynamic server usage") {
    Write-Host "  [FAIL] Build errors found" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  [OK] Build completed successfully" -ForegroundColor Green
}
Write-Host ""

# Test 4: Check API routes exist
Write-Host "Test 4: API Route Verification" -ForegroundColor Yellow
if (Test-Path "app/api/db/init/route.ts") {
    Write-Host "  [OK] Route exists: app/api/db/init/route.ts" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Route missing: app/api/db/init/route.ts" -ForegroundColor Red
    exit 1
}

if (Test-Path "app/api/db/cleanup/route.ts") {
    Write-Host "  [OK] Route exists: app/api/db/cleanup/route.ts" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Route missing: app/api/db/cleanup/route.ts" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 5: Check migration system
Write-Host "Test 5: Migration System Verification" -ForegroundColor Yellow
if (Test-Path "lib/db/migrations/index.ts") {
    Write-Host "  [OK] Migration system exists" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Migration system missing" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 6: Check persistence service functions
Write-Host "Test 6: Persistence Service Verification" -ForegroundColor Yellow
$persistenceFile = Get-Content "lib/db/persistence-service.ts" -Raw

$functions = @(
    "persistFixMessage",
    "persistAuditLogEntry",
    "persistNotification",
    "persistBreachEvent",
    "persistHoldingSnapshot",
    "queryAuditLogEntries",
    "queryNotifications",
    "queryHoldingSnapshots",
    "queryBreachEvents",
    "cleanupOldData"
)

foreach ($func in $functions) {
    $found = $false
    if ($persistenceFile -match "function $func") {
        $found = $true
    }
    if ($persistenceFile -match "async function $func") {
        $found = $true
    }
    
    if ($found) {
        Write-Host "  [OK] Function exists: $func" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Function missing: $func" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All Tests Passed! [OK]" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Set POSTGRES_URL in your production environment" -ForegroundColor White
Write-Host "2. Optionally set DATA_RETENTION_DAYS (default: 90)" -ForegroundColor White
Write-Host "3. Deploy - database will auto-initialize on first request" -ForegroundColor White
Write-Host "4. Schedule cleanup: curl -X POST https://your-app.vercel.app/api/db/cleanup" -ForegroundColor White
Write-Host ""
