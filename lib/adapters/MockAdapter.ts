import type { AssetData } from "@/types";
import type { IPortfolioDataProvider } from "@/lib/types/IDataProvider";
import { regulatoryRules } from "@/lib/mock-data";
import {
  getMarketDataGenerator,
  type RealisticMarketDataGenerator,
} from "@/lib/market-data-generator";

/**
 * Demo mode adapter that mimics production data behavior exactly.
 *
 * Uses sophisticated financial models for position tracking and volatility.
 * This adapter behaves identically to RestProductionAdapter, but uses mock data
 * instead of real external API calls. All timing, frequencies, and data structures
 * match production mode exactly.
 */
export class MockAdapter implements IPortfolioDataProvider {
  private subscribers = new Map<string, Array<(data: AssetData) => void>>();
  private pollIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private generator: RealisticMarketDataGenerator;

  // Optional callback used by the RiskContext to surface synthetic latency
  constructor(private onLatencyUpdate?: (ms: number) => void) {
    this.generator = getMarketDataGenerator();
  }

  async connect(): Promise<boolean> {
    // Immediate success in demo mode - matches production adapter behavior
    // No health check needed since we're using mock data
    return true;
  }

  subscribeToTicker(
    ticker: string,
    callback: (data: AssetData) => void
  ): void {
    // Match RestProductionAdapter behavior exactly:
    // - Store callback in subscribers map
    // - Fire immediately, then poll every 3 seconds (same as production)
    const existing = this.subscribers.get(ticker) ?? [];
    existing.push(callback);
    this.subscribers.set(ticker, existing);

    // If this ticker already has a polling interval, don't create another one
    // (multiple callbacks can share the same interval)
    if (this.pollIntervals.has(ticker)) {
      // Fire immediately for the new callback
      const data = this.generator.generatePriceUpdate(ticker);
      if (data) {
        callback(data);
      }
      return;
    }

    // Poll function that matches production adapter behavior
    // This will call ALL callbacks for this ticker
    const poll = async () => {
      try {
        // Generate mock data (matches production API response structure)
        const data = this.generator.generatePriceUpdate(ticker);
        if (data) {
          // Call all callbacks for this ticker
          const callbacks = this.subscribers.get(ticker) ?? [];
          callbacks.forEach((cb) => cb(data));
          this.simulateLatency();
        }
      } catch {
        // Swallow errors here; connection state is surfaced via connect()
        // This matches RestProductionAdapter error handling
      }
    };

    // Fire immediately, then every 3 seconds (EXACTLY like RestProductionAdapter)
    void poll();
    const interval = setInterval(poll, 3000);
    this.pollIntervals.set(ticker, interval);
  }

  async getRegulatoryConfig(jurisdiction: string): Promise<any> {
    // Match production API response structure exactly
    // Production returns: { jurisdiction, rules: [...], version, sourceSystem }
    const rules = regulatoryRules.filter(
      (rule) => rule.jurisdiction === jurisdiction
    );
    return Promise.resolve({
      jurisdiction,
      rules,
      version: "1.0.0",
      sourceSystem: "Mock Demo Mode",
      // Include same structure as production would return
      source: "Internal Simulation (Mock)",
    });
  }

  /**
   * Clean up polling intervals when the adapter is no longer used.
   * Matches RestProductionAdapter.dispose() behavior exactly.
   */
  dispose() {
    for (const interval of this.pollIntervals.values()) {
      clearInterval(interval);
    }
    this.pollIntervals.clear();
    this.subscribers.clear();
  }

  private simulateLatency() {
    if (!this.onLatencyUpdate) return;

    // Ultra-realistic latency simulation:
    // - Normal: 8-20ms (typical for co-located market data feeds)
    // - Occasional spikes: 25-45ms (network congestion)
    // - Rare outages: 100-200ms (severe network issues, 0.5% chance)
    
    const rand = Math.random();
    let newLatency: number;
    
    if (rand < 0.005) {
      // 0.5% chance: severe network issue
      newLatency = Math.floor(Math.random() * 100) + 100; // 100-200ms
    } else if (rand < 0.05) {
      // 4.5% chance: network congestion spike
      newLatency = Math.floor(Math.random() * 20) + 25; // 25-45ms
    } else {
      // 95% of the time: normal low latency
      newLatency = Math.floor(Math.random() * 12) + 8; // 8-20ms
    }
    
    this.onLatencyUpdate(newLatency);
  }
}


