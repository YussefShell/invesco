import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db/client";

/**
 * Health check endpoint for monitoring server status
 * Returns 200 if the server is running properly
 */
export async function GET() {
  try {
    const dbHealth = await checkDatabaseHealth();
    
    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        database: {
          enabled: dbHealth,
          status: dbHealth ? "connected" : "disabled",
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
      },
      { status: 500 }
    );
  }
}


