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

class HistoricalDataStore {
  private holdingSnapshots: HistoricalHoldingSnapshot[] = [];
  private breachEvents: BreachEvent[] = [];
  private auditLogEntries: AuditLogEntry[] = [];
  private trendDataPoints: TrendDataPoint[] = [];

  // Configuration
  private readonly MAX_SNAPSHOTS = 10000; // Maximum number of holding snapshots to keep
  private readonly MAX_BREACH_EVENTS = 5000; // Maximum number of breach events to keep
  private readonly MAX_AUDIT_ENTRIES = 10000; // Maximum number of audit log entries to keep
  private readonly MAX_TREND_POINTS = 1000; // Maximum number of trend data points to keep
  private readonly SNAPSHOT_INTERVAL_MS = 60000; // Take snapshots every 60 seconds
  private readonly TREND_INTERVAL_MS = 300000; // Create trend points every 5 minutes

  private snapshotIntervalId: NodeJS.Timeout | null = null;
  private trendIntervalId: NodeJS.Timeout | null = null;

  /**
   * Initialize the historical data store and start periodic snapshots
   */
  start(): void {
    // Start periodic holding snapshots
    this.snapshotIntervalId = setInterval(() => {
      // This will be called by external components with current holdings
    }, this.SNAPSHOT_INTERVAL_MS);

    // Start periodic trend data collection
    this.trendIntervalId = setInterval(() => {
      // This will be called by external components with current state
    }, this.TREND_INTERVAL_MS);
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
  }

  /**
   * Record a snapshot of current holdings
   */
  recordHoldingSnapshot(holdings: Holding[]): void {
    const timestamp = new Date().toISOString();
    const snapshots: HistoricalHoldingSnapshot[] = holdings.map((holding) => {
      const ownershipPercent =
        (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
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

