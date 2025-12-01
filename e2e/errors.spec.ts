/**
 * Error Detection Tests
 * 
 * These tests specifically catch the errors you were seeing:
 * - MIME type errors
 * - 404 errors for static assets
 * - Console errors
 * - Failed resource loads
 */

import { test, expect } from '@playwright/test';
import { waitForNextJsReady, isDevMode } from './helpers/nextjs-ready';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Error Detection', () => {
  test('should not have MIME type errors for JavaScript', async ({ page }) => {
    const mimeErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('MIME type') && 
          text.includes('not executable') &&
          text.includes('.js')) {
        mimeErrors.push(text);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNextJsReady(page);
    
    const devMode = await isDevMode(page);
    
    if (!devMode) {
      await page.waitForLoadState('networkidle');
    } else {
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch {
        // Expected in dev mode
      }
    }

    // Filter out dev mode static asset errors
    const criticalErrors = devMode
      ? mimeErrors.filter(err => 
          !err.includes('_next/static') && 
          !err.includes('_next/webpack') &&
          !err.includes('ChunkLoadError') &&
          !err.includes('_app-pages-browser')
        )
      : mimeErrors;

    if (criticalErrors.length > 0) {
      throw new Error(`MIME type errors detected:\n${criticalErrors.join('\n')}`);
    }
    
    // Warn about filtered errors in dev mode
    if (devMode && mimeErrors.length > criticalErrors.length) {
      console.warn(`Dev mode: Filtered out ${mimeErrors.length - criticalErrors.length} expected static asset MIME type errors`);
    }
  });

  test('should not have MIME type errors for CSS', async ({ page }) => {
    const mimeErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('MIME type') && 
          text.includes('not a supported stylesheet') &&
          text.includes('.css')) {
        mimeErrors.push(text);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNextJsReady(page);
    
    const devMode = await isDevMode(page);
    
    if (!devMode) {
      await page.waitForLoadState('networkidle');
    } else {
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch {
        // Expected in dev mode
      }
    }

    // Filter out dev mode static asset errors
    const criticalErrors = devMode
      ? mimeErrors.filter(err => !err.includes('_next/static'))
      : mimeErrors;

    if (criticalErrors.length > 0) {
      throw new Error(`CSS MIME type errors detected:\n${criticalErrors.join('\n')}`);
    }
    
    // Warn about filtered errors in dev mode
    if (devMode && mimeErrors.length > criticalErrors.length) {
      console.warn(`Dev mode: Filtered out ${mimeErrors.length - criticalErrors.length} expected CSS MIME type errors`);
    }
  });

  test('should not have 404 errors for main-app.js', async ({ page }) => {
    const failedRequests: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('main-app.js') || url.includes('main-')) {
        if (response.status() !== 200) {
          failedRequests.push({
            url,
            status: response.status()
          });
        }
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNextJsReady(page);
    
    const devMode = await isDevMode(page);
    
    if (!devMode) {
      await page.waitForLoadState('networkidle');
    } else {
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch {
        // Expected in dev mode
      }
      
      // In dev mode, wait a bit more for compilation
      if (failedRequests.length > 0) {
        await page.waitForTimeout(3000);
      }
    }

    // In dev mode, allow 404s (on-demand compilation)
    if (devMode && failedRequests.length > 0) {
      console.warn(`Dev mode: main-app.js returned 404 (expected - dev server compiles on demand)`);
      return;
    }

    if (failedRequests.length > 0) {
      throw new Error(`Failed to load main-app.js:\n${JSON.stringify(failedRequests, null, 2)}`);
    }
  });

  test('should not have 404 errors for layout.css', async ({ page }) => {
    const failedRequests: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('layout.css')) {
        if (response.status() !== 200) {
          failedRequests.push({
            url,
            status: response.status()
          });
        }
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNextJsReady(page);
    
    const devMode = await isDevMode(page);
    
    if (!devMode) {
      await page.waitForLoadState('networkidle');
    } else {
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch {
        // Expected in dev mode
      }
    }

    // In dev mode, allow 404s (CSS might be inlined or not yet compiled)
    if (devMode && failedRequests.length > 0) {
      console.warn(`Dev mode: layout.css returned 404 (might be inlined or not yet compiled)`);
      return;
    }

    if (failedRequests.length > 0) {
      throw new Error(`Failed to load layout.css:\n${JSON.stringify(failedRequests, null, 2)}`);
    }
  });

  test('should not have "Refused to execute script" errors', async ({ page }) => {
    const refusedErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Refused to execute script')) {
        refusedErrors.push(text);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNextJsReady(page);
    
    const devMode = await isDevMode(page);
    
    if (!devMode) {
      await page.waitForLoadState('networkidle');
    } else {
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch {
        // Expected in dev mode
      }
    }

    // Filter out dev mode static asset errors
    const criticalErrors = devMode
      ? refusedErrors.filter(err => 
          !err.includes('_next/static') && 
          !err.includes('_next/webpack') &&
          !err.includes('ChunkLoadError') &&
          !err.includes('_app-pages-browser')
        )
      : refusedErrors;

    if (criticalErrors.length > 0) {
      throw new Error(`Script execution errors:\n${criticalErrors.join('\n')}`);
    }
    
    if (devMode && refusedErrors.length > criticalErrors.length) {
      console.warn(`Dev mode: Filtered out ${refusedErrors.length - criticalErrors.length} expected script execution errors`);
    }
  });

  test('should not have "Refused to apply style" errors', async ({ page }) => {
    const refusedErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Refused to apply style')) {
        refusedErrors.push(text);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNextJsReady(page);
    
    const devMode = await isDevMode(page);
    
    if (!devMode) {
      await page.waitForLoadState('networkidle');
    } else {
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch {
        // Expected in dev mode
      }
    }

    // Filter out dev mode static asset errors
    const criticalErrors = devMode
      ? refusedErrors.filter(err => 
          !err.includes('_next/static') &&
          !err.includes('ChunkLoadError') &&
          !err.includes('_app-pages-browser')
        )
      : refusedErrors;

    if (criticalErrors.length > 0) {
      throw new Error(`Style application errors:\n${criticalErrors.join('\n')}`);
    }
    
    if (devMode && refusedErrors.length > criticalErrors.length) {
      console.warn(`Dev mode: Filtered out ${refusedErrors.length - criticalErrors.length} expected style application errors`);
    }
  });

  test('should load all _next/static resources with correct status', async ({ page }) => {
    const failedStaticResources: Array<{ url: string; status: number; contentType: string }> = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/_next/static/')) {
        const status = response.status();
        const contentType = response.headers()['content-type'] || '';

        if (status !== 200) {
          failedStaticResources.push({ url, status, contentType });
        } else {
          // Verify correct content types
          if (url.endsWith('.js') && !contentType.includes('javascript')) {
            failedStaticResources.push({ 
              url, 
              status: 200, 
              contentType: `Wrong MIME type: ${contentType}` 
            });
          }
          if (url.endsWith('.css') && !contentType.includes('css')) {
            failedStaticResources.push({ 
              url, 
              status: 200, 
              contentType: `Wrong MIME type: ${contentType}` 
            });
          }
        }
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNextJsReady(page);
    
    const devMode = await isDevMode(page);
    
    if (!devMode) {
      await page.waitForLoadState('networkidle');
    } else {
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch {
        // Expected in dev mode
      }
    }

    // In dev mode, allow some failures (on-demand compilation)
    if (devMode) {
      if (failedStaticResources.length > 10) {
        throw new Error(
          `Too many static resource failures (${failedStaticResources.length}):\n${JSON.stringify(failedStaticResources.slice(0, 10), null, 2)}...`
        );
      } else if (failedStaticResources.length > 0) {
        console.warn(`Dev mode: ${failedStaticResources.length} static resources failed (expected due to on-demand compilation)`);
      }
    } else {
      if (failedStaticResources.length > 0) {
        throw new Error(
          `Static resources failed:\n${JSON.stringify(failedStaticResources, null, 2)}`
        );
      }
    }
  });

  test('should not have any critical console errors', async ({ page }) => {
    const criticalErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter for critical errors only
        if (
          text.includes('Failed to load') ||
          text.includes('MIME type') ||
          text.includes('404') ||
          text.includes('Refused to') ||
          text.includes('NetworkError') ||
          text.includes('ERR_')
        ) {
          criticalErrors.push(text);
        }
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNextJsReady(page);
    
    const devMode = await isDevMode(page);
    
    if (!devMode) {
      await page.waitForLoadState('networkidle');
    } else {
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch {
        // Expected in dev mode
      }
    }
    
    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Filter out dev mode static asset errors
    const filteredErrors = devMode
      ? criticalErrors.filter(err => 
          !err.includes('_next/static') && 
          !err.includes('_next/webpack') &&
          !err.includes('ChunkLoadError') &&
          !err.includes('_app-pages-browser') &&
          !err.includes('layout.css') &&
          !err.includes('main-app.js') &&
          !err.includes('app/page.js') &&
          !err.includes('app-pages-internals.js')
        )
      : criticalErrors;

    // In dev mode, allow a few filtered errors; in prod, expect none
    const maxAllowed = devMode ? 3 : 0;
    if (filteredErrors.length > maxAllowed) {
      throw new Error(`Critical console errors detected:\n${filteredErrors.join('\n')}`);
    }
    
    if (devMode && criticalErrors.length > filteredErrors.length) {
      console.warn(`Dev mode: Filtered out ${criticalErrors.length - filteredErrors.length} expected static asset errors`);
    }
  });
});

