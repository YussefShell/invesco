import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Tests
 * 
 * These tests verify the application works correctly in a real browser,
 * catching errors that unit tests might miss.
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.PLAYWRIGHT_PROD_MODE ? {
    // Production mode: use built app
    command: 'npm run start',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    stdout: 'pipe',
    stderr: 'pipe',
  } : {
    // Development mode: use dev server
    // Use health endpoint for better readiness detection
    // The health endpoint ensures Next.js API routes are ready
    command: 'npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // Increased timeout for Next.js compilation
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

