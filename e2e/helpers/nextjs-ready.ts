/**
 * Helper utilities for waiting for Next.js to be fully ready
 * In dev mode, Next.js compiles assets on-demand, so we need to wait
 */

/**
 * Check if we're running in development mode
 */
export async function isDevMode(page: any): Promise<boolean> {
  try {
    // Check if the page has dev mode indicators
    const isDev = await page.evaluate(() => {
      // Check for Next.js dev mode indicators
      const scripts = Array.from(document.querySelectorAll('script'));
      const hasDevScript = scripts.some((script: any) => 
        script.src && script.src.includes('_next/static/chunks/webpack')
      );
      
      // Check for development hot reload scripts
      const hasHotReload = scripts.some((script: any) =>
        script.src && (script.src.includes('_next/webpack-hmr') || script.src.includes('__webpack'))
      );
      
      return hasDevScript || hasHotReload;
    });
    
    return isDev;
  } catch {
    // If we can't determine, assume dev mode to be safe
    return true;
  }
}

/**
 * Wait for Next.js static assets to be available
 * This helps with dev server timing issues
 */
export async function waitForNextJsReady(page: any, timeout = 10000) {
  const startTime = Date.now();
  
  // Wait for the page to have DOM content
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
  } catch {
    // Page might be slow to load, continue anyway
  }
  
  // Check if Next.js has rendered the page (more lenient check)
  try {
    const isReady = await page.evaluate(() => {
      // Check for Next.js root element or any content
      const nextRoot = document.querySelector('#__next');
      const hasBody = document.body && document.body.children.length > 0;
      const hasContent = document.body && document.body.innerText.trim().length > 0;
      
      // Return true if we have any indication the page loaded
      return (nextRoot !== null || hasBody || hasContent) && typeof window !== 'undefined';
    });
    
    if (isReady) {
      // Give Next.js a moment to settle, but don't wait too long
      try {
        await page.waitForLoadState('networkidle', { timeout: 3000 });
      } catch {
        // Network might not be idle, especially in dev mode with missing assets
        // That's okay - we'll proceed anyway
      }
      
      // Small delay to allow any pending operations
      await page.waitForTimeout(500);
      return true;
    }
  } catch (error) {
    // Evaluation failed, but page might still be usable
  }
  
  // If we haven't returned yet, wait a bit more but be lenient
  const remainingTime = timeout - (Date.now() - startTime);
  if (remainingTime > 0) {
    await page.waitForTimeout(Math.min(remainingTime, 2000));
  }
  
  // Return true anyway - don't block tests indefinitely
  // In dev mode, missing static assets are expected and tests should still run
  return true;
}

/**
 * Wait for a specific static asset to be available
 */
export async function waitForAsset(
  page: any,
  assetPattern: string | RegExp,
  timeout = 10000
): Promise<boolean> {
  const startTime = Date.now();
  const pattern = typeof assetPattern === 'string' 
    ? new RegExp(assetPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    : assetPattern;
  
  while ((Date.now() - startTime) < timeout) {
    const responses = await page.evaluate(() => {
      return (performance as any).getEntriesByType?.('resource') || [];
    });
    
    const assetFound = responses.some((entry: any) => {
      const url = entry.name || entry.url || '';
      return pattern.test(url) && entry.responseStatus === 200;
    });
    
    if (assetFound) {
      return true;
    }
    
    await page.waitForTimeout(200);
  }
  
  return false;
}

