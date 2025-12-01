/**
 * Server-side Database Initialization
 * 
 * Ensures database is initialized on application startup.
 * Gracefully falls back if database is unavailable.
 */

import { getDatabaseConfig } from "./client";
import { runMigrations } from "./migrations";

// Get sql client - we'll import it dynamically to match client.ts logic
let sql: any = null;

// Initialize sql client using the same logic as client.ts
async function getSqlClient() {
  if (sql) return sql;
  
  const config = getDatabaseConfig();
  if (!config.enabled || !config.connectionString) {
    // Try @vercel/postgres for Vercel auto-config
    try {
      const vercelPostgres = await import("@vercel/postgres");
      sql = vercelPostgres.sql;
      return sql;
    } catch (error) {
      console.error("[DB] Failed to import @vercel/postgres:", error);
      return null;
    }
  }
  
  // Use postgres.js for Supabase/external PostgreSQL
  try {
    const postgres = await import("postgres");
    const postgresOptions: any = {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    };
    
    if (config.connectionString.includes('supabase.co')) {
      postgresOptions.ssl = { rejectUnauthorized: false };
    }
    
    sql = postgres.default(config.connectionString, postgresOptions);
    return sql;
  } catch (error) {
    console.error("[DB] Failed to import postgres.js:", error);
    // Fall back to @vercel/postgres
    try {
      const vercelPostgres = await import("@vercel/postgres");
      sql = vercelPostgres.sql;
      return sql;
    } catch (vercelError) {
      console.error("[DB] Failed to import @vercel/postgres fallback:", vercelError);
      return null;
    }
  }
}

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

    const sqlClient = await getSqlClient();
    if (!sqlClient) {
      const error = new Error("Database module not available - could not initialize SQL client");
      initError = error;
      console.log("[DB] Database module not available, skipping initialization");
      return false;
    }

    try {
      console.log("[DB] Initializing database...");

      // Test connection first
      await sqlClient`SELECT 1`;

      // Run migrations
      await runMigrations(sqlClient);

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

