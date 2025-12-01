/**
 * Database Persistence Service
 * 
 * Provides high-level methods for persisting data to the database.
 * Falls back gracefully if database is not available.
 */

import { sql } from "@vercel/postgres";
import { getDatabaseConfig } from "./client";
import type { ParsedFixMessage } from "@/lib/adapters/FixProtocolAdapter";
import type { Notification } from "@/types/notifications";
import type { BreachEvent, AuditLogEntry, HistoricalHoldingSnapshot } from "@/types";

/**
 * Check if database is enabled (checked dynamically to support testing)
 */
function isDatabaseEnabled(): boolean {
  return getDatabaseConfig().enabled;
}

/**
 * Persist a FIX message to the database
 */
export async function persistFixMessage(
  rawFix: string,
  parsed: ParsedFixMessage
): Promise<void> {
  if (!isDatabaseEnabled()) {
    return; // Silently skip if database is not available
  }

  try {
    await sql`
      INSERT INTO fix_messages (
        raw_message,
        msg_type,
        symbol,
        quantity,
        price,
        side,
        checksum_valid
      ) VALUES (
        ${rawFix},
        ${parsed.msgType || null},
        ${parsed.symbol || null},
        ${parsed.quantity || null},
        ${parsed.price || null},
        ${parsed.side || null},
        false
      )
    `;
  } catch (error) {
    console.error("[DB] Failed to persist FIX message:", error);
    // Don't throw - allow application to continue
  }
}

/**
 * Persist an audit log entry
 */
export async function persistAuditLogEntry(
  entryText: string,
  systemId: string,
  level: string,
  message: string
): Promise<void> {
  if (!isDatabaseEnabled()) {
    return;
  }

  try {
    await sql`
      INSERT INTO audit_log_entries (
        entry_text,
        system_id,
        level,
        message
      ) VALUES (
        ${entryText},
        ${systemId || null},
        ${level || null},
        ${message || null}
      )
    `;
  } catch (error) {
    console.error("[DB] Failed to persist audit log entry:", error);
  }
}

/**
 * Persist a notification to the database
 */
export async function persistNotification(
  notification: Notification,
  recipientName?: string
): Promise<void> {
  if (!isDatabaseEnabled()) {
    return;
  }

  try {
    await sql`
      INSERT INTO notifications (
        recipient_id,
        recipient_name,
        channel,
        title,
        message,
        severity,
        status
      ) VALUES (
        ${notification.recipientId},
        ${recipientName || null},
        ${notification.channel},
        ${notification.title || null},
        ${notification.message || null},
        ${notification.severity || null},
        ${notification.status || 'sent'}
      )
    `;
  } catch (error) {
    console.error("[DB] Failed to persist notification:", error);
  }
}

/**
 * Persist a breach event
 */
export async function persistBreachEvent(event: BreachEvent): Promise<void> {
  if (!isDatabaseEnabled()) {
    return;
  }

  try {
    await sql`
      INSERT INTO breach_events (
        ticker,
        jurisdiction,
        ownership_percent,
        threshold,
        status,
        event_type,
        detected_at
      ) VALUES (
        ${event.ticker},
        ${event.jurisdiction},
        ${event.ownershipPercent},
        ${event.threshold},
        ${event.eventType || 'BREACH_DETECTED'},
        ${event.eventType || 'BREACH_DETECTED'},
        ${event.timestamp || new Date().toISOString()}
      )
    `;
  } catch (error) {
    console.error("[DB] Failed to persist breach event:", error);
  }
}

/**
 * Persist a holding snapshot
 */
export async function persistHoldingSnapshot(
  ticker: string,
  jurisdiction: string,
  sharesOwned: number,
  totalSharesOutstanding: number,
  ownershipPercent: number,
  buyingVelocity: number
): Promise<void> {
  if (!isDatabaseEnabled()) {
    return;
  }

  try {
    await sql`
      INSERT INTO holding_snapshots (
        ticker,
        jurisdiction,
        shares_owned,
        total_shares_outstanding,
        ownership_percent,
        buying_velocity
      ) VALUES (
        ${ticker},
        ${jurisdiction},
        ${sharesOwned},
        ${totalSharesOutstanding},
        ${ownershipPercent},
        ${buyingVelocity}
      )
    `;
  } catch (error) {
    console.error("[DB] Failed to persist holding snapshot:", error);
  }
}

/**
 * Query audit log entries
 */
export async function queryAuditLogEntries(
  limit: number = 100,
  systemId?: string,
  level?: string
): Promise<AuditLogEntry[]> {
  if (!isDatabaseEnabled()) {
    return [];
  }

  try {
    let result;
    
    if (systemId && level) {
      result = await sql`
        SELECT 
          id,
          entry_text as entryText,
          system_id as systemId,
          level,
          message,
          created_at as createdAt
        FROM audit_log_entries
        WHERE system_id = ${systemId} AND level = ${level}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else if (systemId) {
      result = await sql`
        SELECT 
          id,
          entry_text as entryText,
          system_id as systemId,
          level,
          message,
          created_at as createdAt
        FROM audit_log_entries
        WHERE system_id = ${systemId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else if (level) {
      result = await sql`
        SELECT 
          id,
          entry_text as entryText,
          system_id as systemId,
          level,
          message,
          created_at as createdAt
        FROM audit_log_entries
        WHERE level = ${level}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      result = await sql`
        SELECT 
          id,
          entry_text as entryText,
          system_id as systemId,
          level,
          message,
          created_at as createdAt
        FROM audit_log_entries
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }
    return result.rows.map((row) => ({
      id: row.id.toString(),
      timestamp: new Date(row.createdat).toISOString(),
      rawLine: row.entrytext || '',
      systemId: row.systemid || '',
      level: (row.level as AuditLogEntry['level']) || 'INFO',
      message: row.message || '',
    }));
  } catch (error) {
    console.error("[DB] Failed to query audit log entries:", error);
    return [];
  }
}

/**
 * Query notifications with filters
 */
export async function queryNotifications(
  limit: number = 100,
  recipientId?: string,
  channel?: string,
  severity?: string,
  status?: string,
  startDate?: string,
  endDate?: string
): Promise<Notification[]> {
  if (!isDatabaseEnabled()) {
    return [];
  }

  try {
    let result;
    
    // Build query with all filters
    if (recipientId && channel && severity && status && startDate && endDate) {
      result = await sql`
        SELECT * FROM notifications
        WHERE recipient_id = ${recipientId} 
          AND channel = ${channel}
          AND severity = ${severity}
          AND status = ${status}
          AND sent_at >= ${startDate}
          AND sent_at <= ${endDate}
        ORDER BY sent_at DESC
        LIMIT ${limit}
      `;
    } else if (recipientId && channel && startDate && endDate) {
      result = await sql`
        SELECT * FROM notifications
        WHERE recipient_id = ${recipientId} 
          AND channel = ${channel}
          AND sent_at >= ${startDate}
          AND sent_at <= ${endDate}
        ORDER BY sent_at DESC
        LIMIT ${limit}
      `;
    } else if (recipientId && channel) {
      result = await sql`
        SELECT * FROM notifications
        WHERE recipient_id = ${recipientId} AND channel = ${channel}
        ORDER BY sent_at DESC
        LIMIT ${limit}
      `;
    } else if (recipientId) {
      result = await sql`
        SELECT * FROM notifications
        WHERE recipient_id = ${recipientId}
        ORDER BY sent_at DESC
        LIMIT ${limit}
      `;
    } else if (channel) {
      result = await sql`
        SELECT * FROM notifications
        WHERE channel = ${channel}
        ORDER BY sent_at DESC
        LIMIT ${limit}
      `;
    } else if (startDate && endDate) {
      result = await sql`
        SELECT * FROM notifications
        WHERE sent_at >= ${startDate} AND sent_at <= ${endDate}
        ORDER BY sent_at DESC
        LIMIT ${limit}
      `;
    } else {
      result = await sql`
        SELECT * FROM notifications
        ORDER BY sent_at DESC
        LIMIT ${limit}
      `;
    }

    // Apply additional filters in memory if needed (for severity/status when not in WHERE)
    let filtered = result.rows;
    if (severity && !recipientId && !channel) {
      filtered = filtered.filter((row: any) => row.severity === severity);
    }
    if (status && !recipientId && !channel) {
      filtered = filtered.filter((row: any) => row.status === status);
    }

    return filtered.map((row: any) => ({
      id: row.id.toString(),
      recipientId: row.recipient_id,
      channel: row.channel,
      severity: row.severity as Notification['severity'],
      status: row.status as Notification['status'],
      title: row.title || '',
      message: row.message || '',
      holdingId: undefined,
      ticker: undefined,
      jurisdiction: undefined,
      sentAt: new Date(row.sent_at).toISOString(),
    }));
  } catch (error) {
    console.error("[DB] Failed to query notifications:", error);
    return [];
  }
}

/**
 * Query holding snapshots
 */
export async function queryHoldingSnapshots(
  ticker?: string,
  jurisdiction?: string,
  limit: number = 100,
  startDate?: string,
  endDate?: string
): Promise<HistoricalHoldingSnapshot[]> {
  if (!isDatabaseEnabled()) {
    return [];
  }

  try {
    let result;
    
    // Build query with filters
    if (ticker && jurisdiction && startDate && endDate) {
      result = await sql`
        SELECT 
          id,
          ticker,
          jurisdiction,
          shares_owned as "sharesOwned",
          total_shares_outstanding as "totalSharesOutstanding",
          ownership_percent as "ownershipPercent",
          buying_velocity as "buyingVelocity",
          snapshot_time as "snapshotTime"
        FROM holding_snapshots
        WHERE ticker = ${ticker} 
          AND jurisdiction = ${jurisdiction}
          AND snapshot_time >= ${startDate}
          AND snapshot_time <= ${endDate}
        ORDER BY snapshot_time DESC
        LIMIT ${limit}
      `;
    } else if (ticker && jurisdiction) {
      result = await sql`
        SELECT 
          id,
          ticker,
          jurisdiction,
          shares_owned as "sharesOwned",
          total_shares_outstanding as "totalSharesOutstanding",
          ownership_percent as "ownershipPercent",
          buying_velocity as "buyingVelocity",
          snapshot_time as "snapshotTime"
        FROM holding_snapshots
        WHERE ticker = ${ticker} AND jurisdiction = ${jurisdiction}
        ORDER BY snapshot_time DESC
        LIMIT ${limit}
      `;
    } else if (ticker) {
      result = await sql`
        SELECT 
          id,
          ticker,
          jurisdiction,
          shares_owned as "sharesOwned",
          total_shares_outstanding as "totalSharesOutstanding",
          ownership_percent as "ownershipPercent",
          buying_velocity as "buyingVelocity",
          snapshot_time as "snapshotTime"
        FROM holding_snapshots
        WHERE ticker = ${ticker}
        ORDER BY snapshot_time DESC
        LIMIT ${limit}
      `;
    } else if (startDate && endDate) {
      result = await sql`
        SELECT 
          id,
          ticker,
          jurisdiction,
          shares_owned as "sharesOwned",
          total_shares_outstanding as "totalSharesOutstanding",
          ownership_percent as "ownershipPercent",
          buying_velocity as "buyingVelocity",
          snapshot_time as "snapshotTime"
        FROM holding_snapshots
        WHERE snapshot_time >= ${startDate} AND snapshot_time <= ${endDate}
        ORDER BY snapshot_time DESC
        LIMIT ${limit}
      `;
    } else {
      result = await sql`
        SELECT 
          id,
          ticker,
          jurisdiction,
          shares_owned as "sharesOwned",
          total_shares_outstanding as "totalSharesOutstanding",
          ownership_percent as "ownershipPercent",
          buying_velocity as "buyingVelocity",
          snapshot_time as "snapshotTime"
        FROM holding_snapshots
        ORDER BY snapshot_time DESC
        LIMIT ${limit}
      `;
    }

    return result.rows.map((row) => ({
      id: row.id.toString(),
      ticker: row.ticker,
      jurisdiction: row.jurisdiction,
      sharesOwned: parseFloat(row.sharesOwned),
      totalSharesOutstanding: parseFloat(row.totalSharesOutstanding),
      ownershipPercent: parseFloat(row.ownershipPercent),
      buyingVelocity: parseFloat(row.buyingVelocity || 0),
      timestamp: new Date(row.snapshotTime).toISOString(),
      regulatoryStatus: (row.regulatoryStatus as any) || 'SAFE',
      threshold: parseFloat(row.threshold || 10),
    }));
  } catch (error) {
    console.error("[DB] Failed to query holding snapshots:", error);
    return [];
  }
}

/**
 * Query breach events
 */
export async function queryBreachEvents(
  ticker?: string,
  jurisdiction?: string,
  limit: number = 100,
  startDate?: string,
  endDate?: string
): Promise<BreachEvent[]> {
  if (!isDatabaseEnabled()) {
    return [];
  }

  try {
    let result;
    
    if (ticker && jurisdiction && startDate && endDate) {
      result = await sql`
        SELECT 
          id,
          ticker,
          jurisdiction,
          ownership_percent as "ownershipPercent",
          threshold,
          status,
          event_type as "eventType",
          detected_at as "detectedAt",
          resolved_at as "resolvedAt"
        FROM breach_events
        WHERE ticker = ${ticker} 
          AND jurisdiction = ${jurisdiction}
          AND detected_at >= ${startDate}
          AND detected_at <= ${endDate}
        ORDER BY detected_at DESC
        LIMIT ${limit}
      `;
    } else if (ticker && jurisdiction) {
      result = await sql`
        SELECT 
          id,
          ticker,
          jurisdiction,
          ownership_percent as "ownershipPercent",
          threshold,
          status,
          event_type as "eventType",
          detected_at as "detectedAt",
          resolved_at as "resolvedAt"
        FROM breach_events
        WHERE ticker = ${ticker} AND jurisdiction = ${jurisdiction}
        ORDER BY detected_at DESC
        LIMIT ${limit}
      `;
    } else if (ticker) {
      result = await sql`
        SELECT 
          id,
          ticker,
          jurisdiction,
          ownership_percent as "ownershipPercent",
          threshold,
          status,
          event_type as "eventType",
          detected_at as "detectedAt",
          resolved_at as "resolvedAt"
        FROM breach_events
        WHERE ticker = ${ticker}
        ORDER BY detected_at DESC
        LIMIT ${limit}
      `;
    } else if (startDate && endDate) {
      result = await sql`
        SELECT 
          id,
          ticker,
          jurisdiction,
          ownership_percent as "ownershipPercent",
          threshold,
          status,
          event_type as "eventType",
          detected_at as "detectedAt",
          resolved_at as "resolvedAt"
        FROM breach_events
        WHERE detected_at >= ${startDate} AND detected_at <= ${endDate}
        ORDER BY detected_at DESC
        LIMIT ${limit}
      `;
    } else {
      result = await sql`
        SELECT 
          id,
          ticker,
          jurisdiction,
          ownership_percent as "ownershipPercent",
          threshold,
          status,
          event_type as "eventType",
          detected_at as "detectedAt",
          resolved_at as "resolvedAt"
        FROM breach_events
        ORDER BY detected_at DESC
        LIMIT ${limit}
      `;
    }

    return result.rows.map((row) => ({
      id: row.id.toString(),
      ticker: row.ticker,
      jurisdiction: row.jurisdiction,
      ownershipPercent: parseFloat(row.ownershipPercent),
      threshold: parseFloat(row.threshold),
      eventType: (row.eventType || row.status) as BreachEvent['eventType'],
      timestamp: new Date(row.detectedAt).toISOString(),
      buyingVelocity: 0, // Not stored in DB, would need to calculate or add column
      projectedBreachTime: null,
    }));
  } catch (error) {
    console.error("[DB] Failed to query breach events:", error);
    return [];
  }
}

/**
 * Clean up old data based on retention period
 * Retention period in days (default: 90)
 */
export async function cleanupOldData(retentionDays: number = 90): Promise<void> {
  if (!isDatabaseEnabled()) {
    return;
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`[DB] Cleaning up data older than ${retentionDays} days (before ${cutoffISO})`);

    // Delete old FIX messages
    const fixResult = await sql`
      DELETE FROM fix_messages
      WHERE created_at < ${cutoffISO}
    `;
    console.log(`[DB] Deleted ${fixResult.rowCount || 0} old FIX messages`);

    // Delete old audit log entries (keep critical ones longer if needed)
    const auditResult = await sql`
      DELETE FROM audit_log_entries
      WHERE created_at < ${cutoffISO} AND level != 'CRITICAL'
    `;
    console.log(`[DB] Deleted ${auditResult.rowCount || 0} old audit log entries`);

    // Delete old notifications
    const notificationResult = await sql`
      DELETE FROM notifications
      WHERE sent_at < ${cutoffISO}
    `;
    console.log(`[DB] Deleted ${notificationResult.rowCount || 0} old notifications`);

    // Delete old holding snapshots (keep one per day per ticker/jurisdiction)
    // First, identify snapshots to keep (one per day)
    await sql`
      DELETE FROM holding_snapshots
      WHERE id NOT IN (
        SELECT DISTINCT ON (ticker, jurisdiction, DATE(snapshot_time))
          id
        FROM holding_snapshots
        WHERE snapshot_time >= ${cutoffISO}
        ORDER BY ticker, jurisdiction, DATE(snapshot_time), snapshot_time DESC
      )
      AND snapshot_time < ${cutoffISO}
    `;
    console.log(`[DB] Cleaned up old holding snapshots`);

    // Delete old breach events (keep all, but could add logic here)
    // Breach events are important for compliance, so we keep them longer
    const breachCutoff = new Date();
    breachCutoff.setDate(breachCutoff.getDate() - (retentionDays * 2)); // Keep breach events 2x longer
    const breachCutoffISO = breachCutoff.toISOString();
    
    const breachResult = await sql`
      DELETE FROM breach_events
      WHERE detected_at < ${breachCutoffISO} AND status = 'BREACH_RESOLVED'
    `;
    console.log(`[DB] Deleted ${breachResult.rowCount || 0} old resolved breach events`);

    console.log(`[DB] ✅ Data cleanup completed`);
  } catch (error) {
    console.error("[DB] Failed to cleanup old data:", error);
    // Don't throw - cleanup failures shouldn't break the app
  }
}

