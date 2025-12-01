# Run E2E tests against production build
# This is more reliable than dev mode for testing static asset serving

$ErrorActionPreference = "Stop"

Write-Host "Building production bundle..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Kill any existing Node processes on port 3000
Write-Host "Clearing port 3000..." -ForegroundColor Yellow
$existingProcesses = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($existingProcesses) {
    $existingProcesses | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
}

Write-Host "Starting production server in background..." -ForegroundColor Yellow
$env:PLAYWRIGHT_PROD_MODE = "true"

# Start server in background job
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:PLAYWRIGHT_PROD_MODE = "true"
    npm start 2>&1
}

# Wait for server to be ready
Write-Host "Waiting for server to be ready..." -ForegroundColor Yellow
$maxWait = 30
$waited = 0
$ready = $false

while ($waited -lt $maxWait -and -not $ready) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $ready = $true
            Write-Host "Server is ready!" -ForegroundColor Green
        }
    } catch {
        Start-Sleep -Seconds 1
        $waited++
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

Write-Host ""

if (-not $ready) {
    Write-Host "Server failed to start within $maxWait seconds" -ForegroundColor Red
    Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job -Job $serverJob -ErrorAction SilentlyContinue
    exit 1
}

# Give server a moment to fully initialize
Start-Sleep -Seconds 2

Write-Host "Running E2E tests against production build..." -ForegroundColor Cyan
npx playwright test

$testExitCode = $LASTEXITCODE

# Cleanup
Write-Host "Stopping production server..." -ForegroundColor Yellow
Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
Remove-Job -Job $serverJob -Force -ErrorAction SilentlyContinue

# Also kill any remaining node processes on port 3000
$remainingProcesses = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($remainingProcesses) {
    $remainingProcesses | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}

exit $testExitCode

