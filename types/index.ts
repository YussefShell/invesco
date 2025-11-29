export type Jurisdiction = "USA" | "UK" | "Hong Kong" | "APAC" | "Other";

export type RegulatoryStatus = "breach" | "warning" | "safe";

export interface RegulatoryRule {
  code: string;
  name: string;
  description: string;
  threshold: number;
  jurisdiction: Jurisdiction;
}

export interface Position {
  id: string;
  ticker?: string;
  issuer: string;
  isin: string;
  jurisdiction: Jurisdiction;
  currentPosition: number; // percentage
  threshold: number; // percentage
  buyingVelocity: number; // shares per hour
  regulatoryRule: RegulatoryRule;
}

export interface Holding {
  id: string;
  ticker: string;
  issuer: string;
  isin: string;
  jurisdiction: Jurisdiction;
  sharesOwned: number;
  totalSharesOutstanding: number;
  buyingVelocity: number;
  regulatoryRule: RegulatoryRule;
   /**
   * Timestamp of the last successful data refresh for this holding.
   * Stored as an ISO-8601 string for easy serialization.
   */
  lastUpdated: string;
  /**
   * Real-time price from market data adapter (optional, populated when adapter is connected).
   */
  price?: number;
}

export interface BreachCalculation {
  projectedBreachTime: number | null; // hours, null if safe
  status: RegulatoryStatus;
  timeToBreach: string; // formatted string like "Breach in 2.5 Hours" or "Safe"
}

export interface JurisdictionStatus {
  jurisdiction: Jurisdiction;
  status: RegulatoryStatus;
  activeBreaches: number;
  warnings: number;
  safe: number;
}

export interface SystemStatus {
  apiConnection: "Stable" | "Degraded" | "Down";
  latency: number; // milliseconds
  globalFeed: "Active" | "Inactive";
}

/**
 * Canonical shape for live/simulated asset-level market data used by adapters.
 */
export interface AssetData {
  ticker: string;
  /**
   * Simplified last traded price (or synthetic price in simulation mode).
   */
  price: number;
  /**
   * Percentage ownership or risk-relevant position metric for the asset.
   */
  currentPosition?: number;
  jurisdiction: Jurisdiction;
  lastUpdated: string;
}

/**
 * Historical data types for persistence and trend analysis
 */

export interface HistoricalHoldingSnapshot {
  id: string;
  ticker: string;
  timestamp: string; // ISO-8601
  sharesOwned: number;
  totalSharesOutstanding: number;
  ownershipPercent: number;
  buyingVelocity: number;
  price?: number;
  jurisdiction: Jurisdiction;
  regulatoryStatus: RegulatoryStatus;
  threshold: number;
}

export interface BreachEvent {
  id: string;
  ticker: string;
  jurisdiction: Jurisdiction;
  timestamp: string; // ISO-8601
  eventType: "BREACH_DETECTED" | "BREACH_ACKNOWLEDGED" | "BREACH_RESOLVED" | "WARNING_DETECTED" | "WARNING_CLEARED";
  ownershipPercent: number;
  threshold: number;
  buyingVelocity: number;
  projectedBreachTime?: number | null; // hours
  metadata?: Record<string, any>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO-8601
  systemId: string;
  level: "BOOT" | "BREACH" | "BREACH_WORKFLOW" | "SIMULATION" | "SYSTEM" | "INFO";
  message: string;
  rawLine: string; // Original formatted log line
  metadata?: Record<string, any>;
}

export interface TrendDataPoint {
  timestamp: string; // ISO-8601
  totalBreaches: number;
  totalWarnings: number;
  totalSafe: number;
  byJurisdiction: Record<Jurisdiction, {
    breaches: number;
    warnings: number;
    safe: number;
  }>;
  avgOwnershipPercent: number;
  avgBuyingVelocity: number;
}

export interface HistoricalDataQuery {
  startTime?: string; // ISO-8601
  endTime?: string; // ISO-8601
  ticker?: string;
  jurisdiction?: Jurisdiction;
  eventType?: BreachEvent["eventType"];
  limit?: number;
}

