import { NextResponse } from "next/server";
import { checkDatabaseHealth, getDatabaseConfig } from "@/lib/db/client";

/**
 * Health check endpoint for monitoring server status
 * Returns 200 if the server is running properly
 */
export async function GET() {
  try {
    const dbConfig = getDatabaseConfig();
    const dbHealth = await checkDatabaseHealth();
    const usingFallback = !dbConfig.enabled || !dbHealth;
    
    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        database: {
          enabled: dbConfig.enabled,
          status: dbHealth ? "connected" : (dbConfig.enabled ? "error" : "disabled"),
          usingFallback,
          storage: usingFallback ? "localStorage" : "database",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        database: {
          enabled: false,
          status: "error",
          usingFallback: true,
          storage: "localStorage",
        },
      },
      { status: 500 }
    );
  }
}


