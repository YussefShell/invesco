import type { Holding } from "@/types";

/**
 * Server-side cache for portfolio holdings
 * This allows the API to serve the same data that the client is using
 */
class PortfolioCache {
  private holdings: Holding[] = [];
  private lastUpdated: Date | null = null;
  private readonly MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Update the cached holdings
   */
  updateHoldings(holdings: Holding[]): void {
    this.holdings = holdings;
    this.lastUpdated = new Date();
  }

  /**
   * Get the cached holdings if they're still fresh
   */
  getHoldings(): Holding[] | null {
    if (!this.lastUpdated) {
      return null; // No data cached yet
    }

    const age = Date.now() - this.lastUpdated.getTime();
    if (age > this.MAX_AGE_MS) {
      return null; // Cache expired
    }

    return this.holdings;
  }

  /**
   * Check if cache has data
   */
  hasData(): boolean {
    return this.holdings.length > 0 && this.lastUpdated !== null;
  }
}

// Singleton instance
let portfolioCacheInstance: PortfolioCache | null = null;

export function getPortfolioCache(): PortfolioCache {
  if (!portfolioCacheInstance) {
    portfolioCacheInstance = new PortfolioCache();
  }
  return portfolioCacheInstance;
}

