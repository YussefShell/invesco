/**
 * Database Migration System
 * 
 * Simple versioned migration system for database schema changes.
 * Migrations are run in order and tracked in schema_migrations table.
 */

import { getDatabaseConfig } from "../client";

export interface Migration {
  version: number;
  name: string;
  up: (sql: any) => Promise<void>;
  down?: (sql: any) => Promise<void>;
}

/**
 * Migration 1: Initial Schema
 * Creates all base tables and indexes
 */
const migration001_initial_schema: Migration = {
  version: 1,
  name: "initial_schema",
  up: async (sql) => {
    // Create schema_migrations table first
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create FIX messages table
    await sql`
      CREATE TABLE IF NOT EXISTS fix_messages (
        id SERIAL PRIMARY KEY,
        raw_message TEXT NOT NULL,
        msg_type VARCHAR(10),
        symbol VARCHAR(20),
        quantity DECIMAL(18, 2),
        price DECIMAL(18, 6),
        side VARCHAR(10),
        checksum_valid BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for FIX messages
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_fix_symbol ON fix_messages(symbol)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_fix_created_at ON fix_messages(created_at)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_fix_msg_type ON fix_messages(msg_type)`;
    } catch {}

    // Create audit log entries table
    await sql`
      CREATE TABLE IF NOT EXISTS audit_log_entries (
        id SERIAL PRIMARY KEY,
        entry_text TEXT NOT NULL,
        system_id VARCHAR(100),
        level VARCHAR(50),
        message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for audit log
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_system_id ON audit_log_entries(system_id)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_level ON audit_log_entries(level)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log_entries(created_at)`;
    } catch {}

    // Create notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id VARCHAR(100) NOT NULL,
        recipient_name VARCHAR(255),
        channel VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        message TEXT,
        severity VARCHAR(50),
        status VARCHAR(50) DEFAULT 'sent',
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for notifications
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`;
    } catch {}

    // Create breach events table
    await sql`
      CREATE TABLE IF NOT EXISTS breach_events (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        jurisdiction VARCHAR(50) NOT NULL,
        ownership_percent DECIMAL(10, 4) NOT NULL,
        threshold DECIMAL(10, 4) NOT NULL,
        status VARCHAR(50) NOT NULL,
        event_type VARCHAR(50),
        detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB
      )
    `;

    // Create indexes for breach events
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_breach_ticker ON breach_events(ticker)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_breach_jurisdiction ON breach_events(jurisdiction)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_breach_status ON breach_events(status)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_breach_detected_at ON breach_events(detected_at)`;
    } catch {}

    // Create holding snapshots table
    await sql`
      CREATE TABLE IF NOT EXISTS holding_snapshots (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        jurisdiction VARCHAR(50) NOT NULL,
        shares_owned DECIMAL(18, 2) NOT NULL,
        total_shares_outstanding DECIMAL(18, 2) NOT NULL,
        ownership_percent DECIMAL(10, 4) NOT NULL,
        buying_velocity DECIMAL(18, 2) DEFAULT 0,
        snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for holding snapshots
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_snapshots_ticker ON holding_snapshots(ticker)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_snapshots_jurisdiction ON holding_snapshots(jurisdiction)`;
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_snapshots_time ON holding_snapshots(snapshot_time)`;
    } catch {}
  },
};

// All migrations in order
export const migrations: Migration[] = [
  migration001_initial_schema,
  // Future migrations go here:
  // migration002_add_new_feature,
  // migration003_update_schema,
];

/**
 * Run all pending migrations
 */
export async function runMigrations(sql: any): Promise<void> {
  const config = getDatabaseConfig();
  if (!config.enabled) {
    console.log("[DB] Database disabled, skipping migrations");
    return;
  }

  try {
    // Ensure schema_migrations table exists
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Get applied migrations
    // Handle both postgres.js and @vercel/postgres result formats
    const applied = await sql`
      SELECT version FROM schema_migrations ORDER BY version DESC
    `;
    
    // postgres.js returns array directly, @vercel/postgres returns { rows: [...] }
    const rows = Array.isArray(applied) ? applied : (applied.rows || []);
    const appliedVersions = new Set(
      rows.map((r: any) => r.version)
    );

    // Run pending migrations
    let appliedCount = 0;
    for (const migration of migrations) {
      if (!appliedVersions.has(migration.version)) {
        console.log(
          `[DB] Running migration ${migration.version}: ${migration.name}`
        );
        try {
          await migration.up(sql);
          await sql`
            INSERT INTO schema_migrations (version, name) 
            VALUES (${migration.version}, ${migration.name})
          `;
          appliedCount++;
        } catch (error) {
          console.error(
            `[DB] ❌ Migration ${migration.version} failed:`,
            error
          );
          throw error; // Stop on first failure
        }
      }
    }

    if (appliedCount > 0) {
      console.log(`[DB] ✅ Applied ${appliedCount} migration(s)`);
    } else {
      console.log("[DB] ✅ All migrations up to date");
    }
  } catch (error) {
    console.error("[DB] ❌ Migration system error:", error);
    throw error;
  }
}

/**
 * Get current migration version
 */
export async function getCurrentMigrationVersion(
  sql: any
): Promise<number> {
  try {
    const result = await sql`
      SELECT MAX(version) as max_version FROM schema_migrations
    `;
    // Handle both postgres.js and @vercel/postgres result formats
    const rows = Array.isArray(result) ? result : (result.rows || []);
    return rows[0]?.max_version || 0;
  } catch (error) {
    // If table doesn't exist, return 0
    return 0;
  }
}

