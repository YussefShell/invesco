/**
 * Server-side Database Initialization
 * 
 * Ensures database is initialized on application startup.
 * Gracefully falls back if database is unavailable.
 */

import { sql } from "@vercel/postgres";
import { getDatabaseConfig } from "./client";
import { runMigrations } from "./migrations";

let initialized = false;
let initPromise: Promise<boolean> | null = null;
let initError: Error | null = null;

/**
 * Ensure database is initialized
 * Safe to call multiple times - will only initialize once
 */
export async function ensureDatabaseInitialized(): Promise<boolean> {
  // Return cached result if already initialized
  if (initialized) return true;
  if (initPromise) return initPromise;

  // Start initialization
  initPromise = (async () => {
    const config = getDatabaseConfig();
    if (!config.enabled) {
      console.log("[DB] Database disabled, skipping initialization");
      return false;
    }

    if (!sql) {
      console.log("[DB] Database module not available, skipping initialization");
      return false;
    }

    try {
      console.log("[DB] Initializing database...");

      // Test connection first
      await sql`SELECT 1`;

      // Run migrations
      await runMigrations(sql);

      initialized = true;
      initError = null;
      console.log("[DB] ✅ Database initialized successfully");
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      initError = err;
      console.error("[DB] ❌ Database initialization failed:", err.message);
      // Don't throw - allow app to continue with in-memory fallback
      initialized = false;
      return false;
    }
  })();

  return initPromise;
}

/**
 * Get initialization status
 */
export function getInitializationStatus(): {
  initialized: boolean;
  error: Error | null;
} {
  return {
    initialized,
    error: initError,
  };
}

/**
 * Reset initialization state (useful for testing)
 */
export function resetInitializationState(): void {
  initialized = false;
  initPromise = null;
  initError = null;
}

