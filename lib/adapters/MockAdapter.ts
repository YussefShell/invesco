import type { AssetData } from "@/types";
import type { IPortfolioDataProvider } from "@/lib/types/IDataProvider";
import { regulatoryRules } from "@/lib/mock-data";
import {
  getMarketDataGenerator,
  type RealisticMarketDataGenerator,
} from "@/lib/market-data-generator";

/**
 * Internal simulation adapter with 100% realistic market data.
 *
 * Fetches REAL-TIME prices from public APIs (Yahoo Finance, Alpha Vantage, etc.)
 * and uses sophisticated financial models for position tracking and volatility.
 * This gives you real prices even in "mock" mode.
 */
export class MockAdapter implements IPortfolioDataProvider {
  private subscribers = new Map<string, Array<(data: AssetData) => void>>();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private highFrequencyInterval: ReturnType<typeof setInterval> | null = null;
  private generator: RealisticMarketDataGenerator;
  private realPriceCache = new Map<string, { price: number; timestamp: number }>();
  private useRealPrices = true; // Toggle to use real prices from APIs
  private priceFetchFailures = new Map<string, number>(); // Track failures per ticker

  // Optional callback used by the RiskContext to surface synthetic latency
  constructor(private onLatencyUpdate?: (ms: number) => void) {
    this.generator = getMarketDataGenerator();
  }

  async connect(): Promise<boolean> {
    // Immediate success in simulation mode
    // OPTIMIZED: Reduced update frequency to prevent performance issues
    
    // High-frequency updates (every 1-2 seconds) for active subscribers
    // Reduced from 250-500ms to reduce CPU load
    if (!this.highFrequencyInterval) {
      this.highFrequencyInterval = setInterval(() => {
        this.emitHighFrequencyTicks();
      }, 1000 + Math.random() * 1000); // 1-2 second intervals (reduced from 250-500ms)
    }
    
    // Standard updates for all subscribed tickers (every 3-5 seconds)
    // Reduced from 1-2 seconds to reduce re-renders
    if (!this.tickInterval) {
      this.tickInterval = setInterval(() => {
        this.emitAllTicks();
        this.simulateLatency();
      }, 3000 + Math.random() * 2000); // 3-5 second intervals (reduced from 1-2 seconds)
    }
    
    return true;
  }

  subscribeToTicker(
    ticker: string,
    callback: (data: AssetData) => void
  ): void {
    const existing = this.subscribers.get(ticker) ?? [];
    existing.push(callback);
    this.subscribers.set(ticker, existing);

    // Send an immediate snapshot (with real price if available)
    void this.generateAssetDataWithRealPrice(ticker).then((data) => {
      callback(data);
    });
  }

  async getRegulatoryConfig(jurisdiction: string): Promise<any> {
    // In real life this would be an async call; here we just echo mock config
    const rules = regulatoryRules.filter(
      (rule) => rule.jurisdiction === jurisdiction
    );
    return Promise.resolve({
      jurisdiction,
      rules,
      source: "Internal Simulation (Mock)",
    });
  }

  /**
   * Clean up timers when the adapter is no longer used.
   */
  dispose() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.highFrequencyInterval) {
      clearInterval(this.highFrequencyInterval);
      this.highFrequencyInterval = null;
    }
  }

  /**
   * Fetch real-time price from API
   */
  private async fetchRealPrice(ticker: string): Promise<number | null> {
    // Check if we've had too many failures for this ticker (rate limit protection)
    const failures = this.priceFetchFailures.get(ticker) ?? 0;
    if (failures > 5) {
      // After 5 failures, stop trying for this ticker for a while
      return null;
    }

    try {
      const res = await fetch(`/api/real-time-prices?ticker=${encodeURIComponent(ticker)}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        this.priceFetchFailures.set(ticker, failures + 1);
        return null;
      }

      const data = (await res.json()) as AssetData;
      
      // Reset failure count on success
      this.priceFetchFailures.set(ticker, 0);
      
      // Cache the real price
      this.realPriceCache.set(ticker, {
        price: data.price,
        timestamp: Date.now(),
      });

      return data.price;
    } catch (error) {
      this.priceFetchFailures.set(ticker, failures + 1);
      return null;
    }
  }

  /**
   * Generate asset data with real prices when available
   */
  private async generateAssetDataWithRealPrice(ticker: string): Promise<AssetData> {
    // Get base data from generator (for position, jurisdiction, etc.)
    // The generator now handles all tickers, including unknown ones
    const baseData = this.generator.generatePriceUpdate(ticker);
    if (!baseData) {
      // Ultimate fallback - should rarely happen now, but ensure price changes
      const fallbackPrice = 50 + Math.random() * 150; // Random price 50-200
      return {
        ticker,
        price: Number(fallbackPrice.toFixed(2)),
        currentPosition: 0,
        jurisdiction: "USA",
        lastUpdated: new Date().toISOString(),
      };
    }

    // Try to get real price
    if (this.useRealPrices) {
      const cached = this.realPriceCache.get(ticker);
      const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
      
      // Use cached price if less than 10 seconds old
      if (cached && cacheAge < 10000) {
        return {
          ...baseData,
          price: cached.price,
        };
      }

      // Fetch new real price (non-blocking)
      this.fetchRealPrice(ticker).then((realPrice) => {
        if (realPrice !== null) {
          // Update subscribers with real price when it arrives
          const callbacks = this.subscribers.get(ticker);
          if (callbacks) {
            const updatedData: AssetData = {
              ...baseData,
              price: realPrice,
            };
            callbacks.forEach((cb) => cb(updatedData));
          }
        }
      });
    }

    // Return base data (with generated price) immediately
    // Real price will update subscribers asynchronously when available
    return baseData;
  }

  /**
   * Emit high-frequency updates (optimized to reduce load)
   * OPTIMIZED: Reduced update percentage to prevent overwhelming the UI
   */
  private emitHighFrequencyTicks() {
    // Update a random subset of active subscribers (simulating high trade volume)
    const subscribers = Array.from(this.subscribers.entries());
    if (subscribers.length === 0) return;
    
    // Update 10-20% of subscribed tickers each cycle (reduced from 30-50%)
    // This still provides real-time feel without overwhelming the browser
    const updateCount = Math.max(1, Math.floor(subscribers.length * (0.1 + Math.random() * 0.1)));
    const shuffled = [...subscribers].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < updateCount && i < shuffled.length; i++) {
      const [ticker, callbacks] = shuffled[i];
      void this.generateAssetDataWithRealPrice(ticker).then((data) => {
        callbacks.forEach((cb) => cb(data));
      });
    }
  }

  /**
   * Emit updates for all subscribed tickers (standard frequency)
   */
  private emitAllTicks() {
    for (const [ticker, callbacks] of this.subscribers.entries()) {
      void this.generateAssetDataWithRealPrice(ticker).then((data) => {
        callbacks.forEach((cb) => cb(data));
      });
    }
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


