/**
 * Database Test Endpoint
 * Used to debug database connection and initialization issues
 */

import { NextResponse } from "next/server";
import { getDatabaseConfig } from "@/lib/db/client";

export async function GET() {
  try {
    const config = getDatabaseConfig();
    
    // Test getting SQL client
    let sqlClient = null;
    let clientError = null;
    
    try {
      const config = getDatabaseConfig();
      if (config.enabled && config.connectionString) {
        // Try postgres.js
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
          
          sqlClient = postgres(config.connectionString, postgresOptions);
        } catch (postgresError: any) {
          clientError = `postgres.js error: ${postgresError.message}`;
          // Try @vercel/postgres
          try {
            const vercelPostgres = require("@vercel/postgres");
            sqlClient = vercelPostgres.sql;
          } catch (vercelError: any) {
            clientError = `Both failed: postgres.js (${postgresError.message}), @vercel/postgres (${vercelError.message})`;
          }
        }
      } else {
        // Try @vercel/postgres
        try {
          const vercelPostgres = require("@vercel/postgres");
          sqlClient = vercelPostgres.sql;
        } catch (vercelError: any) {
          clientError = `@vercel/postgres error: ${vercelError.message}`;
        }
      }
    } catch (error: any) {
      clientError = `Error getting client: ${error.message}`;
    }
    
    // Test connection if we have a client
    let connectionTest = null;
    if (sqlClient) {
      try {
        const result = await sqlClient`SELECT 1 as test`;
        connectionTest = { success: true, result: result };
      } catch (error: any) {
        connectionTest = { success: false, error: error.message };
      }
    }
    
    return NextResponse.json({
      config: {
        enabled: config.enabled,
        hasConnectionString: !!config.connectionString,
        connectionStringPreview: config.connectionString 
          ? config.connectionString.substring(0, 50) + '...' 
          : null,
      },
      client: {
        available: !!sqlClient,
        error: clientError,
      },
      connection: connectionTest,
      env: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
        hasPostgresUrlNonPooling: !!process.env.POSTGRES_URL_NON_POOLING,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

