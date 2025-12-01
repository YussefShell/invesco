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
import type { BreachEvent, AuditLogEntry } from "@/types";

const config = getDatabaseConfig();
const isEnabled = config.enabled;

/**
 * Persist a FIX message to the database
 */
export async function persistFixMessage(
  rawFix: string,
  parsed: ParsedFixMessage
): Promise<void> {
  if (!isEnabled) {
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
  if (!isEnabled) {
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
  if (!isEnabled) {
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
  if (!isEnabled) {
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
        detected_at
      ) VALUES (
        ${event.ticker},
        ${event.jurisdiction},
        ${event.ownershipPercent},
        ${event.threshold},
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
  if (!isEnabled) {
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
  if (!isEnabled) {
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
 * Query notifications
 */
export async function queryNotifications(
  limit: number = 100,
  recipientId?: string,
  channel?: string
): Promise<Notification[]> {
  if (!isEnabled) {
    return [];
  }

  try {
    let result;
    
    if (recipientId && channel) {
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
    } else {
      result = await sql`
        SELECT * FROM notifications
        ORDER BY sent_at DESC
        LIMIT ${limit}
      `;
    }
    return result.rows.map((row) => ({
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

