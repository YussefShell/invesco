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
function getSqlClient() {
  if (sql) return sql;
  
  const config = getDatabaseConfig();
  if (!config.enabled || !config.connectionString) {
    // Try @vercel/postgres for Vercel auto-config
    try {
      const vercelPostgres = require("@vercel/postgres");
      sql = vercelPostgres.sql;
      return sql;
    } catch (error) {
      return null;
    }
  }
  
  // Use postgres.js for Supabase/external PostgreSQL
  try {
    const postgres = require("postgres");
    const postgresOptions: any = {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    };
    
    if (config.connectionString.includes('supabase.co')) {
      postgresOptions.ssl = { rejectUnauthorized: false };
    }
    
    sql = postgres(config.connectionString, postgresOptions);
    return sql;
  } catch (error) {
    // Fall back to @vercel/postgres
    try {
      const vercelPostgres = require("@vercel/postgres");
      sql = vercelPostgres.sql;
      return sql;
    } catch (vercelError) {
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

    const sqlClient = getSqlClient();
    if (!sqlClient) {
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

