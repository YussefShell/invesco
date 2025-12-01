/**
 * Database Initialization API Route
 * 
 * This endpoint initializes database tables on application startup.
 * Safe to call multiple times - it won't recreate existing tables.
 */

import { NextResponse } from "next/server";
import { ensureDatabaseInitialized } from "@/lib/db/init-server";
import { getDatabaseConfig } from "@/lib/db/client";

export async function POST() {
  try {
    const config = getDatabaseConfig();
    
    if (!config.enabled) {
      return NextResponse.json({
        success: false,
        message: "Database initialization skipped (not configured or disabled)",
      }, { status: 200 }); // 200 because skipping is not an error
    }

    const success = await ensureDatabaseInitialized();
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: "Database initialized successfully",
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Database initialization failed - check server logs",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Database initialization error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Allow GET for health checks
  return POST();
}

