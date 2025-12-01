/**
 * Database Cleanup API Route
 * 
 * Cleans up old data based on retention period (default: 90 days).
 * Can be called manually or scheduled via cron.
 */

import { NextResponse } from "next/server";
import { cleanupOldData } from "@/lib/db/persistence-service";
import { getDatabaseConfig } from "@/lib/db/client";

export async function POST() {
  try {
    const config = getDatabaseConfig();
    if (!config.enabled) {
      return NextResponse.json({
        success: false,
        message: "Database is not enabled",
      }, { status: 400 });
    }

    // Get retention period from environment (default: 90 days)
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || "90", 10);

    console.log(`[DB Cleanup] Starting cleanup with ${retentionDays} day retention period`);

    await cleanupOldData(retentionDays);

    return NextResponse.json({
      success: true,
      message: `Data cleanup completed (retention: ${retentionDays} days)`,
      retentionDays,
    });
  } catch (error) {
    console.error("[DB Cleanup] Error:", error);
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
  // Allow GET for manual triggers
  return POST();
}

