# Test Yahoo Finance Only Implementation
Write-Host "=== Testing Yahoo Finance Only Price API ===" -ForegroundColor Cyan
Write-Host ""

# Wait for server to be ready
Write-Host "Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$baseUrl = "http://localhost:3000"
$passed = 0
$failed = 0

# Test Helper Function
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [scriptblock]$Validator
    )
    
    Write-Host "Test: $Name" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        
        if ($Validator) {
            $result = & $Validator $data $response.StatusCode
            if ($result -eq $true) {
                Write-Host "  [PASS] $Name" -ForegroundColor Green
                $script:passed++
                return $true
            } else {
                Write-Host "  [FAIL] $Name - $result" -ForegroundColor Red
                $script:failed++
                return $false
            }
        } else {
            Write-Host "  [INFO] Response received" -ForegroundColor Cyan
            Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Cyan
            $script:passed++
            return $true
        }
    } catch {
        $httpError = $_.Exception.Response
        if ($httpError) {
            try {
                $reader = New-Object System.IO.StreamReader($httpError.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                $data = $responseBody | ConvertFrom-Json
                $statusCode = [int]$httpError.StatusCode
                
                if ($Validator) {
                    $result = & $Validator $data $statusCode
                    if ($result -eq $true) {
                        Write-Host "  [PASS] $Name" -ForegroundColor Green
                        $script:passed++
                        return $true
                    } else {
                        Write-Host "  [FAIL] $Name - $result" -ForegroundColor Red
                        $script:failed++
                        return $false
                    }
                } else {
                    Write-Host "  [INFO] Response received" -ForegroundColor Cyan
                    Write-Host "  Status: $statusCode" -ForegroundColor Cyan
                    $script:passed++
                    return $true
                }
            } catch {
                Write-Host "  [ERROR] $Name - Could not parse error response: $_" -ForegroundColor Red
                $script:failed++
                return $false
            }
        } else {
            Write-Host "  [ERROR] $Name - $_" -ForegroundColor Red
            $script:failed++
            return $false
        }
    }
}

Write-Host "=== Test Suite 1: Valid Ticker Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Valid US ticker (NVDA)
Test-Endpoint -Name "Valid US Ticker (NVDA)" `
    -Url "$baseUrl/api/real-time-prices?ticker=NVDA" `
    -Validator {
        param($data, $statusCode)
        if ($statusCode -ne 200) {
            return "Expected status 200, got $statusCode"
        }
        if (-not $data.price) {
            return "No price in response"
        }
        if ($data.priceSource -ne 'yahoo_finance') {
            return "Expected priceSource 'yahoo_finance', got '$($data.priceSource)'"
        }
        if ($data.ticker -ne 'NVDA') {
            return "Expected ticker 'NVDA', got '$($data.ticker)'"
        }
        Write-Host "    Price: `$$($data.price)" -ForegroundColor Green
        Write-Host "    Source: $($data.priceSource)" -ForegroundColor Green
        Write-Host "    Jurisdiction: $($data.jurisdiction)" -ForegroundColor Green
        return $true
    }

Write-Host ""

# Test 2: Valid US ticker (AAPL)
Test-Endpoint -Name "Valid US Ticker (AAPL)" `
    -Url "$baseUrl/api/real-time-prices?ticker=AAPL" `
    -Validator {
        param($data, $statusCode)
        if ($statusCode -ne 200) {
            return "Expected status 200, got $statusCode"
        }
        if ($data.priceSource -ne 'yahoo_finance') {
            return "Expected priceSource 'yahoo_finance', got '$($data.priceSource)'"
        }
        Write-Host "    Price: `$$($data.price)" -ForegroundColor Green
        Write-Host "    Source: $($data.priceSource)" -ForegroundColor Green
        return $true
    }

Write-Host ""

# Test 3: Valid UK ticker (RIO)
Test-Endpoint -Name "Valid UK Ticker (RIO)" `
    -Url "$baseUrl/api/real-time-prices?ticker=RIO&jurisdiction=UK" `
    -Validator {
        param($data, $statusCode)
        if ($statusCode -ne 200) {
            return "Expected status 200, got $statusCode"
        }
        if ($data.priceSource -ne 'yahoo_finance') {
            return "Expected priceSource 'yahoo_finance', got '$($data.priceSource)'"
        }
        Write-Host "    Price: £$($data.price)" -ForegroundColor Green
        Write-Host "    Source: $($data.priceSource)" -ForegroundColor Green
        return $true
    }

Write-Host ""

# Test 4: Valid HK ticker (0700.HK)
Test-Endpoint -Name "Valid HK Ticker (0700.HK)" `
    -Url "$baseUrl/api/real-time-prices?ticker=0700.HK" `
    -Validator {
        param($data, $statusCode)
        if ($statusCode -ne 200) {
            return "Expected status 200, got $statusCode"
        }
        if ($data.priceSource -ne 'yahoo_finance') {
            return "Expected priceSource 'yahoo_finance', got '$($data.priceSource)'"
        }
        Write-Host "    Price: HK`$$($data.price)" -ForegroundColor Green
        Write-Host "    Source: $($data.priceSource)" -ForegroundColor Green
        return $true
    }

Write-Host ""
Write-Host "=== Test Suite 2: Invalid Ticker Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 5: Invalid ticker should fail gracefully
Test-Endpoint -Name "Invalid Ticker (INVALIDTICKER123)" `
    -Url "$baseUrl/api/real-time-prices?ticker=INVALIDTICKER123" `
    -Validator {
        param($data, $statusCode)
        if ($statusCode -ne 503) {
            return "Expected status 503 (Service Unavailable), got $statusCode"
        }
        if (-not $data.error) {
            return "Expected error message in response"
        }
        if ($data.error -notlike "*Yahoo Finance*") {
            return "Error message should mention Yahoo Finance. Got: $($data.error)"
        }
        Write-Host "    Error: $($data.error)" -ForegroundColor Yellow
        Write-Host "    Hint: $($data.hint)" -ForegroundColor Yellow
        return $true
    }

Write-Host ""

# Test 6: Missing ticker parameter
Test-Endpoint -Name "Missing Ticker Parameter" `
    -Url "$baseUrl/api/real-time-prices" `
    -Validator {
        param($data, $statusCode)
        if ($statusCode -ne 400) {
            return "Expected status 400 (Bad Request), got $statusCode"
        }
        if (-not $data.error) {
            return "Expected error message in response"
        }
        Write-Host "    Error: $($data.error)" -ForegroundColor Yellow
        return $true
    }

Write-Host ""
Write-Host "=== Test Suite 3: Source Verification Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 7: Verify no fallback sources are present
Write-Host "Test: Verify No Fallback Sources" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/real-time-prices?ticker=MSFT" -UseBasicParsing -TimeoutSec 15
    $data = $response.Content | ConvertFrom-Json
    
    $forbiddenSources = @('finnhub', 'alpha_vantage', 'alphaVantage')
    $foundForbidden = $false
    $forbiddenSource = $null
    
    foreach ($source in $forbiddenSources) {
        if ($data.priceSource -like "*$source*") {
            $foundForbidden = $true
            $forbiddenSource = $source
            break
        }
    }
    
    if ($foundForbidden) {
        Write-Host "  [FAIL] Found forbidden fallback source: $forbiddenSource" -ForegroundColor Red
        Write-Host "    Current source: $($data.priceSource)" -ForegroundColor Red
        $script:failed++
    } else {
        Write-Host "  [PASS] No fallback sources detected" -ForegroundColor Green
        Write-Host "    Source: $($data.priceSource)" -ForegroundColor Green
        $script:passed++
    }
} catch {
    Write-Host "  [ERROR] Could not verify sources: $_" -ForegroundColor Red
    $script:failed++
}

Write-Host ""
Write-Host "=== Test Suite 4: Error Message Verification ===" -ForegroundColor Cyan
Write-Host ""

# Test 8: Verify error messages mention Yahoo Finance
Write-Host "Test: Error Messages Mention Yahoo Finance" -ForegroundColor Yellow
try {
    # Try with an obviously invalid ticker
    $response = Invoke-WebRequest -Uri "$baseUrl/api/real-time-prices?ticker=ZZZ999XXX" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    
    # If we get here, check the response
    $data = $response.Content | ConvertFrom-Json
    
    if ($data.error -like "*Yahoo Finance*") {
        Write-Host "  [PASS] Error message correctly mentions Yahoo Finance" -ForegroundColor Green
        Write-Host "    Error: $($data.error)" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  [FAIL] Error message should mention Yahoo Finance" -ForegroundColor Red
        Write-Host "    Error: $($data.error)" -ForegroundColor Red
        $script:failed++
    }
} catch {
    $httpError = $_.Exception.Response
    if ($httpError) {
        try {
            $reader = New-Object System.IO.StreamReader($httpError.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $data = $responseBody | ConvertFrom-Json
            
            if ($data.error -like "*Yahoo Finance*") {
                Write-Host "  [PASS] Error message correctly mentions Yahoo Finance" -ForegroundColor Green
                Write-Host "    Error: $($data.error)" -ForegroundColor Green
                $script:passed++
            } else {
                Write-Host "  [FAIL] Error message should mention Yahoo Finance" -ForegroundColor Red
                Write-Host "    Error: $($data.error)" -ForegroundColor Red
                $script:failed++
            }
        } catch {
            Write-Host "  [WARN] Could not parse error response: $_" -ForegroundColor Yellow
            $script:failed++
        }
    } else {
        Write-Host "  [WARN] Could not verify error message: $_" -ForegroundColor Yellow
        $script:failed++
    }
}

Write-Host ""
Write-Host "=== Test Results ===" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "[SUCCESS] All tests passed! Yahoo Finance-only implementation is working correctly." -ForegroundColor Green
    Write-Host ""
    Write-Host "Key Verification Points:" -ForegroundColor Cyan
    Write-Host "  [OK] All prices come from Yahoo Finance (priceSource = 'yahoo_finance')" -ForegroundColor Green
    Write-Host "  [OK] No fallback to Finnhub or Alpha Vantage" -ForegroundColor Green
    Write-Host "  [OK] Error messages mention Yahoo Finance" -ForegroundColor Green
    Write-Host "  [OK] Invalid tickers fail gracefully" -ForegroundColor Green
} else {
    Write-Host "[FAILED] Some tests failed. Please review the output above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. The dev server is running: npm run dev" -ForegroundColor White
    Write-Host "  2. The server is accessible at http://localhost:3000" -ForegroundColor White
    Write-Host "  3. Yahoo Finance API is accessible" -ForegroundColor White
}

Write-Host ""

