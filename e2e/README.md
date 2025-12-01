# E2E Test Configuration

## Overview

The E2E tests use Playwright to test the application in a real browser environment. The configuration has been optimized to handle Next.js dev server timing issues.

## Improvements Made

### 1. Better Server Readiness Detection
- Playwright now waits for the `/api/health` endpoint instead of just the root URL
- This ensures Next.js API routes are ready before tests start
- Increased timeout to 180 seconds for Next.js compilation

### 2. Next.js Asset Compilation Wait Utility
- Created `e2e/helpers/nextjs-ready.ts` with `waitForNextJsReady()` function
- Waits for Next.js to compile and serve static assets before running assertions
- Handles dev server's on-demand compilation timing issues

### 3. Improved Test Wait Strategies
- All tests now use `domcontentloaded` instead of `networkidle` for initial load
- Added `waitForNextJsReady()` call after page navigation
- Then wait for `networkidle` to ensure all assets are loaded

### 4. Production Build Testing Option
- Added `test:e2e:prod` scripts to run tests against production build
- More reliable for testing static asset serving
- Use `scripts/test-e2e-prod.ps1` for Windows PowerShell

## Running Tests

### Development Mode (Default)
```bash
npm run test:e2e
```

This runs tests against the Next.js dev server. The configuration includes wait utilities to handle dev server timing.

### Production Mode (More Reliable)
```bash
npm run test:e2e:prod
# Or on Windows PowerShell:
.\scripts\test-e2e-prod.ps1
```

This builds the app and runs tests against the production server. This is more reliable for testing static asset serving.

### With UI
```bash
npm run test:e2e:ui
npm run test:e2e:prod:ui
```

## Known Issues

### Dev Server Static Assets
In development mode, Next.js compiles assets on-demand, which can cause timing issues:
- Some static assets might return 404 on first request
- MIME types might be incorrect during initial compilation
- The wait utilities help mitigate these issues

### Solutions
1. Use production build mode for more reliable testing: `npm run test:e2e:prod`
2. The wait utilities give Next.js time to compile before assertions
3. Tests are configured to be more resilient to initial load timing

## Test Files

- `e2e/app.spec.ts` - Application functionality tests
- `e2e/errors.spec.ts` - Error detection tests
- `e2e/helpers/nextjs-ready.ts` - Utility functions for waiting on Next.js

## Troubleshooting

If tests fail with 404 errors for static assets:

1. **Try production mode**: `npm run test:e2e:prod`
2. **Clear Next.js cache**: `Remove-Item -Recurse -Force .next`
3. **Restart dev server**: Stop and restart `npm run dev`
4. **Check server logs**: Look for compilation errors in the console

