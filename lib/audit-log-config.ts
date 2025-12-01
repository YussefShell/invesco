/**
 * Audit Log Configuration
 * 
 * Centralized configuration for audit log system IDs, event types, and UI constants.
 * This makes the audit log system dynamic and configurable rather than hardcoded.
 */

/**
 * Get the default system ID from environment variable or use a fallback
 */
export function getDefaultSystemId(): string {
  return process.env.NEXT_PUBLIC_AUDIT_SYSTEM_ID || "RISK-ENGINE-01";
}

/**
 * Get all configured system IDs
 * Can be extended to fetch from an API or configuration service
 */
export function getSystemIds(): string[] {
  const defaultId = getDefaultSystemId();
  const additionalIds = process.env.NEXT_PUBLIC_AUDIT_SYSTEM_IDS 
    ? process.env.NEXT_PUBLIC_AUDIT_SYSTEM_IDS.split(',').map(id => id.trim())
    : [];
  
  return [defaultId, ...additionalIds].filter((id, index, self) => self.indexOf(id) === index);
}

/**
 * Valid audit log event types
 * These are dynamically extracted from log entries, but we define the known types here
 * for type safety and validation
 */
export type AuditLogEventType = 
  | "BOOT" 
  | "BREACH" 
  | "BREACH_WORKFLOW" 
  | "SIMULATION" 
  | "SYSTEM" 
  | "INFO";

/**
 * Get valid event types (can be extended to fetch from API)
 */
export function getValidEventTypes(): AuditLogEventType[] {
  return ["BOOT", "BREACH", "BREACH_WORKFLOW", "SIMULATION", "SYSTEM", "INFO"];
}

/**
 * Ticker exclusion patterns - words that should not be treated as tickers
 * when parsing log entries. Can be configured via environment variable.
 */
export function getTickerExclusions(): string[] {
  const envExclusions = process.env.NEXT_PUBLIC_TICKER_EXCLUSIONS
    ? process.env.NEXT_PUBLIC_TICKER_EXCLUSIONS.split(',').map(t => t.trim().toUpperCase())
    : [];
  
  // Default exclusions for system-related terms
  const defaultExclusions = ["RISK", "SIM", "ENGINE", "BOOT", "SYSTEM", "AUDIT"];
  
  return [...defaultExclusions, ...envExclusions].filter((item, index, self) => self.indexOf(item) === index);
}

/**
 * UI Configuration for Audit Log View
 */
export interface AuditLogUIConfig {
  virtualizer: {
    estimateSize: number;
    overscan: number;
  };
  container: {
    maxHeight: string;
    fontSize: string;
  };
}

/**
 * Get UI configuration (can be overridden via environment variables)
 */
export function getAuditLogUIConfig(): AuditLogUIConfig {
  return {
    virtualizer: {
      estimateSize: parseInt(process.env.NEXT_PUBLIC_AUDIT_ROW_HEIGHT || "30", 10),
      overscan: parseInt(process.env.NEXT_PUBLIC_AUDIT_OVERSCAN || "10", 10),
    },
    container: {
      maxHeight: process.env.NEXT_PUBLIC_AUDIT_MAX_HEIGHT || "400px",
      fontSize: process.env.NEXT_PUBLIC_AUDIT_FONT_SIZE || "11px",
    },
  };
}

/**
 * Boot message template
 */
export function getBootMessage(systemId: string): string {
  const timestamp = new Date().toISOString();
  const message = process.env.NEXT_PUBLIC_AUDIT_BOOT_MESSAGE 
    || "Regulatory audit log initialized. Monitoring for breaches and simulations...";
  return `[${timestamp}] [${systemId}] [BOOT]: ${message}`;
}

