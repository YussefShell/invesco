/**
 * Database Client for Vercel Postgres and Supabase
 * 
 * This module provides a database client that works with:
 * - Vercel Postgres (production)
 * - Supabase (using postgres.js for better compatibility)
 * - Local PostgreSQL (development with connection string)
 * - Falls back gracefully if database is not configured
 */

export interface DatabaseConfig {
  enabled: boolean;
  connectionString?: string;
}

/**
 * Get database configuration from environment variables
 */
function getDatabaseConfig(): DatabaseConfig {
  const connectionString = 
    process.env.POSTGRES_URL || 
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  const explicitlyEnabled = process.env.DATABASE_ENABLED === "true";
  const explicitlyDisabled = process.env.DATABASE_ENABLED === "false";
  const enabled = explicitlyDisabled ? false : (explicitlyEnabled || !!connectionString);

  return {
    enabled: enabled && !!connectionString,
    connectionString,
  };
}

// Export the function for use in other modules
export { getDatabaseConfig };

// Safe import that handles missing database configuration
let sql: any = null;
let postgresClient: any = null;

// Only initialize on server-side (Node.js environment)
if (typeof window === 'undefined') {
  const config = getDatabaseConfig();
  
  // Use postgres.js for Supabase (better compatibility)
  // Use @vercel/postgres only if no connection string is provided (Vercel auto-config)
  if (config.enabled && config.connectionString) {
    // Use postgres.js for Supabase/external PostgreSQL
    try {
      const postgres = require("postgres");
      // Configure for Supabase - SSL is required
      const postgresOptions: any = {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      };
      
      // Supabase requires SSL
      if (config.connectionString.includes('supabase.co')) {
        postgresOptions.ssl = { rejectUnauthorized: false };
      }
      
      postgresClient = postgres(config.connectionString, postgresOptions);
      sql = postgresClient;
      
      // Test connection immediately
      if (process.env.NODE_ENV === 'development') {
        const maskedConn = config.connectionString.replace(/:([^:@]+)@/, ':***@');
        console.log(`[DB] Using postgres.js (Supabase compatible): ${maskedConn.substring(0, 60)}...`);
        // Test connection
        postgresClient`SELECT 1`.then(() => {
          console.log(`[DB] ✅ Connection test successful`);
        }).catch((err: any) => {
          console.error(`[DB] ❌ Connection test failed:`, err?.message);
        });
      }
    } catch (postgresError: any) {
      console.warn("[DB] Failed to initialize postgres.js:", postgresError?.message);
      // Fall back to @vercel/postgres
      try {
        const vercelPostgres = require("@vercel/postgres");
        sql = vercelPostgres.sql;
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DB] Falling back to @vercel/postgres`);
        }
      } catch (vercelError) {
        console.warn("[DB] Neither postgres.js nor @vercel/postgres available");
      }
    }
  } else {
    // No connection string - try @vercel/postgres (for Vercel deployments)
    try {
      const vercelPostgres = require("@vercel/postgres");
      sql = vercelPostgres.sql;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DB] Using @vercel/postgres (Vercel auto-config)`);
      }
    } catch (error) {
      console.warn("[DB] @vercel/postgres not available");
    }
  }
}

/**
 * Initialize database tables using migration system
 * This should be called once on application startup
 * @deprecated Use ensureDatabaseInitialized from init-server.ts instead
 */
export async function initializeDatabase(): Promise<boolean> {
  try {
    const config = getDatabaseConfig();
    
    if (!config.enabled) {
      console.log("[DB] Database disabled or not configured, skipping initialization");
      return false;
    }

    if (!sql) {
      console.log("[DB] Database module not available, skipping initialization");
      return false;
    }

    console.log("[DB] Initializing database using migration system...");

    // Use migration system
    const { runMigrations } = await import("./migrations");
    await runMigrations(sql);

    console.log("[DB] ✅ Database initialized successfully");
    return true;
  } catch (error) {
    console.error("[DB] ❌ Failed to initialize database:", error);
    // Don't throw - allow application to continue without database
    return false;
  }
}

/**
 * Check if database is available
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const config = getDatabaseConfig();
    if (!config.enabled) {
      return false;
    }
    if (!sql) {
      return false;
    }
    // Test connection with a simple query
    await sql`SELECT 1 as test`;
    return true;
  } catch (error: any) {
    // Log detailed error in development
    if (process.env.NODE_ENV === 'development') {
      console.error("[DB] Database health check failed:", error?.message || error);
      if (error?.message?.includes('ECONNREFUSED')) {
        console.error("[DB] Connection refused - check if database is accessible and connection string is correct");
      } else if (error?.message?.includes('timeout')) {
        console.error("[DB] Connection timeout - check network/firewall settings");
      } else if (error?.message?.includes('password')) {
        console.error("[DB] Authentication failed - check password in connection string");
      } else if (error?.message?.includes('ENOTFOUND') || error?.message?.includes('getaddrinfo')) {
        console.error("[DB] DNS resolution failed - check connection string hostname");
      }
    } else {
      console.error("[DB] Database health check failed");
    }
    return false;
  }
}
