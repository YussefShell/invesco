/**
 * Database Client for Vercel Postgres
 * 
 * This module provides a database client that works with:
 * - Vercel Postgres (production)
 * - Local PostgreSQL (development with connection string)
 * - Falls back gracefully if database is not configured
 */

import { sql } from "@vercel/postgres";

export interface DatabaseConfig {
  enabled: boolean;
  connectionString?: string;
}

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  // Check if database is enabled via environment variable
  const enabled = process.env.DATABASE_ENABLED !== "false"; // Default to true if not set
  
  // Vercel Postgres provides connection string automatically
  // For local dev, use POSTGRES_URL or DATABASE_URL
  const connectionString = 
    process.env.POSTGRES_URL || 
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  return {
    enabled: enabled && !!connectionString,
    connectionString,
  };
}

/**
 * Initialize database tables
 * This should be called once on application startup
 */
export async function initializeDatabase(): Promise<boolean> {
  try {
    const config = getDatabaseConfig();
    
    if (!config.enabled) {
      console.log("[DB] Database disabled or not configured, skipping initialization");
      return false;
    }

    console.log("[DB] Initializing database tables...");

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

    // Create indexes for FIX messages (ignore errors if they already exist)
    try {
      await sql`CREATE INDEX idx_fix_symbol ON fix_messages(symbol)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_fix_created_at ON fix_messages(created_at)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_fix_msg_type ON fix_messages(msg_type)`;
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

    // Create indexes for audit log (ignore errors if they already exist)
    try {
      await sql`CREATE INDEX idx_audit_system_id ON audit_log_entries(system_id)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_audit_level ON audit_log_entries(level)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_audit_created_at ON audit_log_entries(created_at)`;
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

    // Create indexes for notifications (ignore errors if they already exist)
    try {
      await sql`CREATE INDEX idx_notifications_recipient ON notifications(recipient_id)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_notifications_channel ON notifications(channel)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_notifications_sent_at ON notifications(sent_at)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_notifications_status ON notifications(status)`;
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
        detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP WITH TIME ZONE
      )
    `;

    // Create indexes for breach events (ignore errors if they already exist)
    try {
      await sql`CREATE INDEX idx_breach_ticker ON breach_events(ticker)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_breach_jurisdiction ON breach_events(jurisdiction)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_breach_status ON breach_events(status)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_breach_detected_at ON breach_events(detected_at)`;
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

    // Create indexes for holding snapshots (ignore errors if they already exist)
    try {
      await sql`CREATE INDEX idx_snapshots_ticker ON holding_snapshots(ticker)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_snapshots_jurisdiction ON holding_snapshots(jurisdiction)`;
    } catch {}
    try {
      await sql`CREATE INDEX idx_snapshots_time ON holding_snapshots(snapshot_time)`;
    } catch {}

    console.log("[DB] ✅ Database tables initialized successfully");
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
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[DB] Database health check failed:", error);
    return false;
  }
}

