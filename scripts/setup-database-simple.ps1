# Simple Database Setup Guide
Write-Host "=== Database Setup Guide ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "PostgreSQL is not installed locally." -ForegroundColor Yellow
Write-Host ""
Write-Host "Quick Setup Options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Free Cloud Database (Recommended)" -ForegroundColor Green
Write-Host "  1. Go to https://neon.tech and create a free account" -ForegroundColor White
Write-Host "  2. Create a new project" -ForegroundColor White
Write-Host "  3. Copy the connection string from the dashboard" -ForegroundColor White
Write-Host "  4. Update POSTGRES_URL in .env.local" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Install PostgreSQL Locally" -ForegroundColor Green
Write-Host "  1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor White
Write-Host "  2. Install and create database: createdb invesco_db" -ForegroundColor White
Write-Host "  3. Update POSTGRES_URL in .env.local" -ForegroundColor White
Write-Host ""
Write-Host "After setting up, restart your dev server!" -ForegroundColor Yellow

