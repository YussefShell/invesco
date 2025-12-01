/**
 * In-memory historical data store for tracking breaches, holdings, and audit logs.
 * This provides persistence and trend analysis capabilities without requiring a database.
 */

import type {
  Holding,
  HistoricalHoldingSnapshot,
  BreachEvent,
  AuditLogEntry,
  TrendDataPoint,
  HistoricalDataQuery,
  RegulatoryStatus,
  Jurisdiction,
} from "@/types";
import { calculateDeltaAdjustedExposure } from "@/lib/calculation-utils";

class HistoricalDataStore {
  private holdingSnapshots: HistoricalHoldingSnapshot[] = [];
  private breachEvents: BreachEvent[] = [];
  private auditLogEntries: AuditLogEntry[] = [];
  private trendDataPoints: TrendDataPoint[] = [];

  // Configuration (reduced for performance)
  private readonly MAX_SNAPSHOTS = 500; // Maximum number of holding snapshots to keep
  private readonly MAX_BREACH_EVENTS = 300; // Maximum number of breach events to keep
  private readonly MAX_AUDIT_ENTRIES = 500; // Maximum number of audit log entries to keep
  private readonly MAX_TREND_POINTS = 200; // Maximum number of trend data points to keep
  private readonly SNAPSHOT_INTERVAL_MS = 60000; // Take snapshots every 60 seconds
  private readonly TREND_INTERVAL_MS = 300000; // Create trend points every 5 minutes

  // localStorage keys
  private readonly STORAGE_KEY_SNAPSHOTS = "historical_data_snapshots";
  private readonly STORAGE_KEY_BREACH_EVENTS = "historical_data_breach_events";
  private readonly STORAGE_KEY_AUDIT_ENTRIES = "historical_data_audit_entries";
  private readonly STORAGE_KEY_TREND_POINTS = "historical_data_trend_points";

  private snapshotIntervalId: NodeJS.Timeout | null = null;
  private trendIntervalId: NodeJS.Timeout | null = null;
  private saveIntervalId: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * Initialize the historical data store and start periodic snapshots
   */
  start(): void {
    // Load persisted data from localStorage
    this.loadFromStorage();

    // Start periodic holding snapshots
    this.snapshotIntervalId = setInterval(() => {
      // This will be called by external components with current holdings
    }, this.SNAPSHOT_INTERVAL_MS);

    // Start periodic trend data collection
    this.trendIntervalId = setInterval(() => {
      // This will be called by external components with current state
    }, this.TREND_INTERVAL_MS);

    // Auto-save to localStorage every 30 seconds
    this.saveIntervalId = setInterval(() => {
      this.saveToStorage();
    }, 30000);

    this.isInitialized = true;
  }

  /**
   * Stop periodic collection
   */
  stop(): void {
    if (this.snapshotIntervalId) {
      clearInterval(this.snapshotIntervalId);
      this.snapshotIntervalId = null;
    }
    if (this.trendIntervalId) {
      clearInterval(this.trendIntervalId);
      this.trendIntervalId = null;
    }
    if (this.saveIntervalId) {
      clearInterval(this.saveIntervalId);
      this.saveIntervalId = null;
    }
    // Save data before stopping
    this.saveToStorage();
  }

  /**
   * Save all data to localStorage (client-side persistence)
   */
  private saveToStorage(): void {
    if (typeof window === "undefined") return; // Server-side: skip

    try {
      // Save each data type separately to avoid localStorage size limits
      localStorage.setItem(
        this.STORAGE_KEY_SNAPSHOTS,
        JSON.stringify(this.holdingSnapshots.slice(-this.MAX_SNAPSHOTS))
      );
      localStorage.setItem(
        this.STORAGE_KEY_BREACH_EVENTS,
        JSON.stringify(this.breachEvents.slice(-this.MAX_BREACH_EVENTS))
      );
      localStorage.setItem(
        this.STORAGE_KEY_AUDIT_ENTRIES,
        JSON.stringify(this.auditLogEntries.slice(-this.MAX_AUDIT_ENTRIES))
      );
      localStorage.setItem(
        this.STORAGE_KEY_TREND_POINTS,
        JSON.stringify(this.trendDataPoints.slice(-this.MAX_TREND_POINTS))
      );
    } catch (error) {
      // Handle localStorage quota exceeded or other errors
      console.warn("Failed to save historical data to localStorage:", error);
      // Try to clear old data and retry with smaller dataset
      try {
        const halfSnapshots = this.holdingSnapshots.slice(-Math.floor(this.MAX_SNAPSHOTS / 2));
        const halfBreachEvents = this.breachEvents.slice(-Math.floor(this.MAX_BREACH_EVENTS / 2));
        const halfAuditEntries = this.auditLogEntries.slice(-Math.floor(this.MAX_AUDIT_ENTRIES / 2));
        const halfTrendPoints = this.trendDataPoints.slice(-Math.floor(this.MAX_TREND_POINTS / 2));

        localStorage.setItem(this.STORAGE_KEY_SNAPSHOTS, JSON.stringify(halfSnapshots));
        localStorage.setItem(this.STORAGE_KEY_BREACH_EVENTS, JSON.stringify(halfBreachEvents));
        localStorage.setItem(this.STORAGE_KEY_AUDIT_ENTRIES, JSON.stringify(halfAuditEntries));
        localStorage.setItem(this.STORAGE_KEY_TREND_POINTS, JSON.stringify(halfTrendPoints));
      } catch (retryError) {
        console.error("Failed to save historical data even after reducing size:", retryError);
      }
    }
  }

  /**
   * Load persisted data from localStorage (client-side only)
   */
  private loadFromStorage(): void {
    if (typeof window === "undefined") return; // Server-side: skip

    try {
      // Load snapshots
      const savedSnapshots = localStorage.getItem(this.STORAGE_KEY_SNAPSHOTS);
      if (savedSnapshots) {
        this.holdingSnapshots = JSON.parse(savedSnapshots) as HistoricalHoldingSnapshot[];
      }

      // Load breach events
      const savedBreachEvents = localStorage.getItem(this.STORAGE_KEY_BREACH_EVENTS);
      if (savedBreachEvents) {
        this.breachEvents = JSON.parse(savedBreachEvents) as BreachEvent[];
      }

      // Load audit log entries
      const savedAuditEntries = localStorage.getItem(this.STORAGE_KEY_AUDIT_ENTRIES);
      if (savedAuditEntries) {
        this.auditLogEntries = JSON.parse(savedAuditEntries) as AuditLogEntry[];
      }

      // Load trend data points
      const savedTrendPoints = localStorage.getItem(this.STORAGE_KEY_TREND_POINTS);
      if (savedTrendPoints) {
        this.trendDataPoints = JSON.parse(savedTrendPoints) as TrendDataPoint[];
      }
    } catch (error) {
      console.warn("Failed to load historical data from localStorage:", error);
      // Clear corrupted data
      this.clearStorage();
    }
  }

  /**
   * Clear all persisted data from localStorage
   */
  private clearStorage(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(this.STORAGE_KEY_SNAPSHOTS);
      localStorage.removeItem(this.STORAGE_KEY_BREACH_EVENTS);
      localStorage.removeItem(this.STORAGE_KEY_AUDIT_ENTRIES);
      localStorage.removeItem(this.STORAGE_KEY_TREND_POINTS);
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
    }
  }

  /**
   * Record a snapshot of current holdings
   */
  recordHoldingSnapshot(holdings: Holding[]): void {
    const timestamp = new Date().toISOString();
    const snapshots: HistoricalHoldingSnapshot[] = holdings.map((holding) => {
      // Use delta-adjusted exposure for institutional-grade accuracy
      const totalExposure = calculateDeltaAdjustedExposure(holding);
      const ownershipPercent =
        (totalExposure / holding.totalSharesOutstanding) * 100;
      const threshold = holding.regulatoryRule.threshold;
      const warningMin = threshold * 0.9;

      let regulatoryStatus: RegulatoryStatus = "safe";
      if (ownershipPercent >= threshold) {
        regulatoryStatus = "breach";
      } else if (ownershipPercent >= warningMin && ownershipPercent < threshold) {
        regulatoryStatus = "warning";
      }

      return {
        id: `${holding.id}-${timestamp}`,
        ticker: holding.ticker,
        timestamp,
        sharesOwned: holding.sharesOwned,
        totalSharesOutstanding: holding.totalSharesOutstanding,
        ownershipPercent,
        buyingVelocity: holding.buyingVelocity,
        price: holding.price,
        jurisdiction: holding.jurisdiction,
        regulatoryStatus,
        threshold,
      };
    });

    this.holdingSnapshots.push(...snapshots);

    // Trim to max size (keep most recent)
    if (this.holdingSnapshots.length > this.MAX_SNAPSHOTS) {
      this.holdingSnapshots = this.holdingSnapshots.slice(-this.MAX_SNAPSHOTS);
    }

    // Auto-save to localStorage if initialized
    if (this.isInitialized) {
      this.saveToStorage();
    }
  }

  /**
   * Record a breach event
   */
  recordBreachEvent(event: Omit<BreachEvent, "id" | "timestamp">): BreachEvent {
    const breachEvent: BreachEvent = {
      ...event,
      id: `breach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.breachEvents.push(breachEvent);

    // Trim to max size (keep most recent)
    if (this.breachEvents.length > this.MAX_BREACH_EVENTS) {
      this.breachEvents = this.breachEvents.slice(-this.MAX_BREACH_EVENTS);
    }

    // Persist to database (async, don't await to avoid blocking)
    import("@/lib/db/persistence-service").then(({ persistBreachEvent }) => {
      persistBreachEvent(breachEvent).catch((error) => {
        console.error("[HistoricalDataStore] Failed to persist breach event:", error);
      });
    });

    // Auto-save to localStorage if initialized
    if (this.isInitialized) {
      this.saveToStorage();
    }

    return breachEvent;
  }

  /**
   * Record an audit log entry
   */
  recordAuditLogEntry(
    rawLine: string,
    systemId: string,
    level: AuditLogEntry["level"],
    message: string,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      systemId,
      level,
      message,
      rawLine,
      metadata,
    };

    this.auditLogEntries.push(entry);

    // Trim to max size (keep most recent)
    if (this.auditLogEntries.length > this.MAX_AUDIT_ENTRIES) {
      this.auditLogEntries = this.auditLogEntries.slice(-this.MAX_AUDIT_ENTRIES);
    }

    // Persist to database (async, don't await to avoid blocking)
    import("@/lib/db/persistence-service").then(({ persistAuditLogEntry }) => {
      persistAuditLogEntry(rawLine, systemId, level || "INFO", message).catch((error) => {
        console.error("[HistoricalDataStore] Failed to persist audit log entry:", error);
      });
    });

    // Auto-save to localStorage if initialized
    if (this.isInitialized) {
      this.saveToStorage();
    }

    return entry;
  }

  /**
   * Record a trend data point
   */
  recordTrendDataPoint(data: Omit<TrendDataPoint, "timestamp">): TrendDataPoint {
    const point: TrendDataPoint = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    this.trendDataPoints.push(point);

    // Trim to max size (keep most recent)
    if (this.trendDataPoints.length > this.MAX_TREND_POINTS) {
      this.trendDataPoints = this.trendDataPoints.slice(-this.MAX_TREND_POINTS);
    }

    // Auto-save to localStorage if initialized
    if (this.isInitialized) {
      this.saveToStorage();
    }

    return point;
  }

  /**
   * Query historical holding snapshots
   */
  queryHoldingSnapshots(query: HistoricalDataQuery = {}): HistoricalHoldingSnapshot[] {
    let results = [...this.holdingSnapshots];

    if (query.startTime) {
      results = results.filter((s) => s.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter((s) => s.timestamp <= query.endTime!);
    }
    if (query.ticker) {
      results = results.filter((s) => s.ticker === query.ticker);
    }
    if (query.jurisdiction) {
      results = results.filter((s) => s.jurisdiction === query.jurisdiction);
    }

    // Sort by timestamp descending (most recent first)
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Query breach events
   */
  queryBreachEvents(query: HistoricalDataQuery = {}): BreachEvent[] {
    let results = [...this.breachEvents];

    if (query.startTime) {
      results = results.filter((e) => e.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter((e) => e.timestamp <= query.endTime!);
    }
    if (query.ticker) {
      results = results.filter((e) => e.ticker === query.ticker);
    }
    if (query.jurisdiction) {
      results = results.filter((e) => e.jurisdiction === query.jurisdiction);
    }
    if (query.eventType) {
      results = results.filter((e) => e.eventType === query.eventType);
    }

    // Sort by timestamp descending (most recent first)
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Query audit log entries
   */
  queryAuditLogEntries(query: HistoricalDataQuery = {}): AuditLogEntry[] {
    let results = [...this.auditLogEntries];

    if (query.startTime) {
      results = results.filter((e) => e.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter((e) => e.timestamp <= query.endTime!);
    }

    // Sort by timestamp descending (most recent first)
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Query trend data points
   */
  queryTrendDataPoints(query: HistoricalDataQuery = {}): TrendDataPoint[] {
    let results = [...this.trendDataPoints];

    if (query.startTime) {
      results = results.filter((p) => p.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter((p) => p.timestamp <= query.endTime!);
    }

    // Sort by timestamp ascending (oldest first) for trend analysis
    results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    if (query.limit) {
      results = results.slice(-query.limit); // Get most recent N points
    }

    return results;
  }

  /**
   * Get breach statistics for a ticker
   */
  getBreachStatistics(ticker: string): {
    totalBreaches: number;
    totalWarnings: number;
    firstBreach?: string;
    lastBreach?: string;
    currentStatus?: RegulatoryStatus;
    breachHistory: BreachEvent[];
  } {
    const events = this.queryBreachEvents({ ticker });
    const breaches = events.filter((e) => e.eventType === "BREACH_DETECTED");
    const warnings = events.filter((e) => e.eventType === "WARNING_DETECTED");

    return {
      totalBreaches: breaches.length,
      totalWarnings: warnings.length,
      firstBreach: breaches.length > 0 ? breaches[breaches.length - 1].timestamp : undefined,
      lastBreach: breaches.length > 0 ? breaches[0].timestamp : undefined,
      breachHistory: events,
    };
  }

  /**
   * Get trend analysis for a time period
   */
  getTrendAnalysis(startTime: string, endTime: string): {
    breachTrend: "increasing" | "decreasing" | "stable";
    warningTrend: "increasing" | "decreasing" | "stable";
    avgOwnershipChange: number;
    avgVelocityChange: number;
    dataPoints: TrendDataPoint[];
  } {
    const points = this.queryTrendDataPoints({ startTime, endTime });
    
    if (points.length < 2) {
      return {
        breachTrend: "stable",
        warningTrend: "stable",
        avgOwnershipChange: 0,
        avgVelocityChange: 0,
        dataPoints: points,
      };
    }

    const first = points[0];
    const last = points[points.length - 1];

    const breachChange = last.totalBreaches - first.totalBreaches;
    const warningChange = last.totalWarnings - first.totalWarnings;

    const ownershipChanges: number[] = [];
    const velocityChanges: number[] = [];

    for (let i = 1; i < points.length; i++) {
      ownershipChanges.push(points[i].avgOwnershipPercent - points[i - 1].avgOwnershipPercent);
      velocityChanges.push(points[i].avgBuyingVelocity - points[i - 1].avgBuyingVelocity);
    }

    const avgOwnershipChange =
      ownershipChanges.length > 0
        ? ownershipChanges.reduce((a, b) => a + b, 0) / ownershipChanges.length
        : 0;
    const avgVelocityChange =
      velocityChanges.length > 0
        ? velocityChanges.reduce((a, b) => a + b, 0) / velocityChanges.length
        : 0;

    return {
      breachTrend:
        breachChange > 2 ? "increasing" : breachChange < -2 ? "decreasing" : "stable",
      warningTrend:
        warningChange > 2 ? "increasing" : warningChange < -2 ? "decreasing" : "stable",
      avgOwnershipChange,
      avgVelocityChange,
      dataPoints: points,
    };
  }

  /**
   * Clear all historical data (useful for testing or reset)
   */
  clear(): void {
    this.holdingSnapshots = [];
    this.breachEvents = [];
    this.auditLogEntries = [];
    this.trendDataPoints = [];
    this.clearStorage();
  }

  /**
   * Get statistics about stored data
   */
  getStatistics(): {
    totalSnapshots: number;
    totalBreachEvents: number;
    totalAuditEntries: number;
    totalTrendPoints: number;
    oldestSnapshot?: string;
    newestSnapshot?: string;
  } {
    return {
      totalSnapshots: this.holdingSnapshots.length,
      totalBreachEvents: this.breachEvents.length,
      totalAuditEntries: this.auditLogEntries.length,
      totalTrendPoints: this.trendDataPoints.length,
      oldestSnapshot:
        this.holdingSnapshots.length > 0
          ? this.holdingSnapshots[this.holdingSnapshots.length - 1].timestamp
          : undefined,
      newestSnapshot:
        this.holdingSnapshots.length > 0 ? this.holdingSnapshots[0].timestamp : undefined,
    };
  }
}

// Singleton instance
export const historicalDataStore = new HistoricalDataStore();

