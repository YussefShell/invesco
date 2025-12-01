/**
 * Database Statistics Endpoint
 * 
 * Returns counts of records in each table to verify data is being collected
 */

import { NextResponse } from "next/server";
import { getDatabaseConfig } from "@/lib/db/client";

async function getSqlClient() {
  const config = getDatabaseConfig();
  if (!config.enabled || !config.connectionString) {
    try {
      const vercelPostgres = await import("@vercel/postgres");
      return vercelPostgres.sql;
    } catch (error) {
      return null;
    }
  }
  
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
    
    return postgres.default(config.connectionString, postgresOptions);
  } catch (error) {
    try {
      const vercelPostgres = await import("@vercel/postgres");
      return vercelPostgres.sql;
    } catch (vercelError) {
      return null;
    }
  }
}

export async function GET() {
  try {
    const config = getDatabaseConfig();
    
    if (!config.enabled) {
      return NextResponse.json({
        enabled: false,
        message: "Database is not enabled",
      });
    }

    const sql = await getSqlClient();
    if (!sql) {
      return NextResponse.json({
        enabled: true,
        connected: false,
        message: "Could not get database client",
      }, { status: 500 });
    }

    // Test connection first
    try {
      await sql`SELECT 1`;
    } catch (error) {
      return NextResponse.json({
        enabled: true,
        connected: false,
        message: "Database connection failed",
        error: error instanceof Error ? error.message : String(error),
      }, { status: 500 });
    }

    // Get counts from each table
    const stats: Record<string, number> = {};
    
    try {
      // Count schema_migrations
      const migrationsResult = await sql`SELECT COUNT(*) as count FROM schema_migrations`;
      const migrationsRows = Array.isArray(migrationsResult) ? migrationsResult : (migrationsResult.rows || []);
      stats.schema_migrations = parseInt(migrationsRows[0]?.count || 0);
    } catch (error) {
      stats.schema_migrations = -1; // Error
    }

    try {
      // Count fix_messages
      const fixResult = await sql`SELECT COUNT(*) as count FROM fix_messages`;
      const fixRows = Array.isArray(fixResult) ? fixResult : (fixResult.rows || []);
      stats.fix_messages = parseInt(fixRows[0]?.count || 0);
    } catch (error) {
      stats.fix_messages = -1; // Error
    }

    try {
      // Count audit_log_entries
      const auditResult = await sql`SELECT COUNT(*) as count FROM audit_log_entries`;
      const auditRows = Array.isArray(auditResult) ? auditResult : (auditResult.rows || []);
      stats.audit_log_entries = parseInt(auditRows[0]?.count || 0);
    } catch (error) {
      stats.audit_log_entries = -1; // Error
    }

    try {
      // Count notifications
      const notifResult = await sql`SELECT COUNT(*) as count FROM notifications`;
      const notifRows = Array.isArray(notifResult) ? notifResult : (notifResult.rows || []);
      stats.notifications = parseInt(notifRows[0]?.count || 0);
    } catch (error) {
      stats.notifications = -1; // Error
    }

    try {
      // Count breach_events
      const breachResult = await sql`SELECT COUNT(*) as count FROM breach_events`;
      const breachRows = Array.isArray(breachResult) ? breachResult : (breachResult.rows || []);
      stats.breach_events = parseInt(breachRows[0]?.count || 0);
    } catch (error) {
      stats.breach_events = -1; // Error
    }

    try {
      // Count holding_snapshots
      const snapshotsResult = await sql`SELECT COUNT(*) as count FROM holding_snapshots`;
      const snapshotsRows = Array.isArray(snapshotsResult) ? snapshotsResult : (snapshotsResult.rows || []);
      stats.holding_snapshots = parseInt(snapshotsRows[0]?.count || 0);
    } catch (error) {
      stats.holding_snapshots = -1; // Error
    }

    // Calculate total records
    const totalRecords = Object.values(stats)
      .filter(count => count >= 0)
      .reduce((sum, count) => sum + count, 0);

    // Check if database has any data
    const hasData = totalRecords > stats.schema_migrations; // Exclude migration records

    return NextResponse.json({
      enabled: true,
      connected: true,
      hasData,
      totalRecords,
      tableCounts: stats,
      message: hasData 
        ? `Database contains ${totalRecords} records across all tables`
        : "Database is empty (no data collected yet)",
    });
  } catch (error) {
    return NextResponse.json({
      enabled: true,
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

