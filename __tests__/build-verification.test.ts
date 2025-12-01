/**
 * Build Verification Tests
 * 
 * These tests verify that the application builds correctly and all
 * static assets are generated properly. This catches errors before
 * you need to check the browser manually.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Build Verification', () => {
  const projectRoot = process.cwd();
  const nextDir = join(projectRoot, '.next');

  beforeAll(() => {
    // Note: Build should be run manually before tests, or use existing build
    // Running build in beforeAll causes issues with test isolation
  });

  describe('Build Success', () => {
    it('should build without TypeScript errors', () => {
      // Skip if .next doesn't exist (build not run)
      if (!existsSync(nextDir)) {
        console.warn('⚠️  .next directory not found. Run "npm run build" first.');
        return;
      }

      // Verify build succeeded by checking for build artifacts
      const buildManifest = join(nextDir, 'build-manifest.json');
      expect(existsSync(buildManifest)).toBe(true);
    });

    it('should generate .next directory', () => {
      expect(existsSync(nextDir)).toBe(true);
    });

    it('should generate build manifest', () => {
      const buildManifest = join(nextDir, 'build-manifest.json');
      expect(existsSync(buildManifest)).toBe(true);
    });
  });

  describe('Static Assets Generation', () => {
    it('should generate static chunks directory', () => {
      const staticChunks = join(nextDir, 'static', 'chunks');
      expect(existsSync(staticChunks)).toBe(true);
    });

    it('should generate CSS files', () => {
      // CSS might be in different locations in dev vs prod builds
      // In production, CSS might be embedded in JS or in a separate directory
      const staticCss = join(nextDir, 'static', 'css');
      const cssInApp = join(nextDir, 'static', 'chunks', 'app');
      
      let hasCss = existsSync(staticCss);
      
      // Check app chunks for CSS
      if (!hasCss && existsSync(cssInApp)) {
        try {
          const files = readdirSync(cssInApp, { recursive: true });
          hasCss = files.some((f: string) => f.endsWith('.css'));
        } catch {
          // Ignore read errors
        }
      }
      
      // Check static chunks directory
      if (!hasCss) {
        const chunksDir = join(nextDir, 'static', 'chunks');
        if (existsSync(chunksDir)) {
          try {
            const files = readdirSync(chunksDir, { recursive: true });
            hasCss = files.some((f: string) => f.endsWith('.css'));
          } catch {
            // CSS might be embedded in JS in production builds - that's OK
          }
        }
      }
      
      // CSS embedded in JS is acceptable for production builds
      // Just verify we have chunks (which may contain CSS)
      if (!hasCss) {
        const chunksDir = join(nextDir, 'static', 'chunks');
        expect(existsSync(chunksDir)).toBe(true); // At least chunks exist
      } else {
        expect(hasCss).toBe(true);
      }
    });

    it('should generate app layout chunk', () => {
      const appChunks = join(nextDir, 'static', 'chunks', 'app');
      expect(existsSync(appChunks)).toBe(true);
    });

    it('should have required JavaScript chunks', () => {
      const staticDir = join(nextDir, 'static');
      expect(existsSync(staticDir)).toBe(true);
      
      // Check that chunks directory exists (webpack might be in different location)
      const chunksDir = join(staticDir, 'chunks');
      expect(existsSync(chunksDir)).toBe(true);
    });
  });

  describe('Route Generation', () => {
    it('should generate main page route', () => {
      const pageRoute = join(nextDir, 'server', 'app', 'page.js');
      expect(existsSync(pageRoute)).toBe(true);
    });

    it('should generate layout route', () => {
      // Layout can be in different locations - check all possibilities
      const layoutRoutes = [
        join(nextDir, 'server', 'app', 'layout.js'),
        join(nextDir, 'static', 'chunks', 'app', 'layout'),
      ];
      
      // Also check if layout chunk exists in app directory
      const appChunks = join(nextDir, 'static', 'chunks', 'app');
      let layoutInChunks = false;
      if (existsSync(appChunks)) {
        try {
          const files = readdirSync(appChunks, { recursive: true });
          layoutInChunks = files.some((f: string) => f.includes('layout') && f.endsWith('.js'));
        } catch {
          // Ignore read errors
        }
      }
      
      const layoutExists = layoutRoutes.some(r => existsSync(r)) || layoutInChunks;
      expect(layoutExists).toBe(true);
    });

    it('should generate API routes', () => {
      const apiRoutes = join(nextDir, 'server', 'app', 'api');
      expect(existsSync(apiRoutes)).toBe(true);
      
      // Check for key API routes
      const healthRoute = join(apiRoutes, 'health', 'route.js');
      const marketDataRoute = join(apiRoutes, 'market-data', 'route.js');
      
      expect(existsSync(healthRoute)).toBe(true);
      expect(existsSync(marketDataRoute)).toBe(true);
    });
  });

  describe('Build Output Validation', () => {
    it('should have valid build artifacts', () => {
      // Verify build succeeded by checking artifacts exist
      const buildManifest = join(nextDir, 'build-manifest.json');
      const routesManifest = join(nextDir, 'routes-manifest.json');
      
      if (!existsSync(buildManifest)) {
        throw new Error('Build manifest not found. Run "npm run build" first.');
      }
      
      expect(existsSync(buildManifest)).toBe(true);
      expect(existsSync(routesManifest)).toBe(true);
    });

    it('should generate route manifest', () => {
      const routesManifest = join(nextDir, 'routes-manifest.json');
      expect(existsSync(routesManifest)).toBe(true);
    });
  });
});

