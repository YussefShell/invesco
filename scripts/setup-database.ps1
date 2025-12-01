# Database Setup Script
# This script helps you set up PostgreSQL for the Invesco Project

Write-Host "=== Database Setup for Invesco Project ===" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is installed
Write-Host "Checking for PostgreSQL..." -ForegroundColor Yellow
$pgInstalled = $false

# Check common PostgreSQL installation paths
$pgPaths = @(
    "C:\Program Files\PostgreSQL\*\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe",
    "$env:ProgramFiles\PostgreSQL\*\bin\psql.exe"
)

foreach ($path in $pgPaths) {
    $psqlPath = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($psqlPath) {
        Write-Host "  [OK] PostgreSQL found at: $($psqlPath.FullName)" -ForegroundColor Green
        $pgInstalled = $true
        break
    }
}

# Check if psql is in PATH
if (-not $pgInstalled) {
    try {
        $null = Get-Command psql -ErrorAction Stop
        Write-Host "  [OK] PostgreSQL (psql) found in PATH" -ForegroundColor Green
        $pgInstalled = $true
    } catch {
        Write-Host "  [INFO] PostgreSQL not found locally" -ForegroundColor Yellow
    }
}

Write-Host ""

if ($pgInstalled) {
    Write-Host "✅ PostgreSQL is installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Create a database:" -ForegroundColor White
    Write-Host "   createdb invesco_db" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Update .env.local with your connection string:" -ForegroundColor White
    Write-Host "   POSTGRES_URL=postgresql://username:password@localhost:5432/invesco_db" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Restart your dev server" -ForegroundColor White
} else {
    Write-Host "📦 PostgreSQL is not installed locally" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You have two options:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option 1: Install PostgreSQL Locally" -ForegroundColor Yellow
    Write-Host "  Download: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "  Or use Chocolatey: choco install postgresql" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Use a Free Cloud Database (Recommended for Quick Setup)" -ForegroundColor Yellow
    Write-Host "  - Neon (Free tier): https://neon.tech" -ForegroundColor White
    Write-Host "  - Supabase (Free tier): https://supabase.com" -ForegroundColor White
    Write-Host "  - Vercel Postgres (if deploying to Vercel): https://vercel.com/docs/storage/vercel-postgres" -ForegroundColor White
    Write-Host ""
    Write-Host "  After creating a database, update .env.local with the connection string" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Would you like to:" -ForegroundColor Cyan
    Write-Host "  [1] Open PostgreSQL download page" -ForegroundColor White
    Write-Host "  [2] Open Neon (cloud database)" -ForegroundColor White
    Write-Host "  [3] Open Supabase (cloud database)" -ForegroundColor White
    Write-Host "  [4] Skip (I will set it up manually)" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Enter your choice (1-4)"
    
    switch ($choice) {
        "1" {
            Start-Process "https://www.postgresql.org/download/windows/"
            Write-Host "Opened PostgreSQL download page" -ForegroundColor Green
        }
        "2" {
            Start-Process "https://neon.tech"
            Write-Host "Opened Neon.tech - Create a free account and database" -ForegroundColor Green
        }
        "3" {
            Start-Process "https://supabase.com"
            Write-Host "Opened Supabase - Create a free account and project" -ForegroundColor Green
        }
        "4" {
            Write-Host "Skipping. Update .env.local manually when ready." -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Remember to:" -ForegroundColor Yellow
Write-Host "  1. Update POSTGRES_URL in .env.local with your connection string" -ForegroundColor White
Write-Host "  2. Restart your dev server" -ForegroundColor White
Write-Host "  3. Initialize database using API endpoint" -ForegroundColor White
