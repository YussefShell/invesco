import type { Holding } from "@/types";

/**
 * Calculate aggregated exposure for a ticker across funds.
 * 
 * @param holdings - All holdings in the portfolio
 * @param ticker - The ticker to calculate exposure for
 * @param scope - 'FUND' returns individual fund percentages, 'GROUP' sums them up
 * @returns Map of fundId -> exposure percentage, or aggregated total if scope is 'GROUP'
 */
export function calculateExposure(
  holdings: Holding[],
  ticker: string,
  scope: "FUND" | "GROUP"
): Map<string, number> | number {
  // Filter holdings for the specific ticker
  const tickerHoldings = holdings.filter((h) => h.ticker === ticker);

  if (tickerHoldings.length === 0) {
    return scope === "GROUP" ? 0 : new Map();
  }

  if (scope === "FUND") {
    // Return individual fund exposures
    const fundExposures = new Map<string, number>();
    tickerHoldings.forEach((holding) => {
      const exposurePercent =
        (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
      const fundKey = holding.fundId || "UNKNOWN";
      fundExposures.set(fundKey, exposurePercent);
    });
    return fundExposures;
  } else {
    // GROUP scope: sum all exposures for this ticker
    const totalExposure = tickerHoldings.reduce((sum, holding) => {
      const exposurePercent =
        (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
      return sum + exposurePercent;
    }, 0);
    return totalExposure;
  }
}

/**
 * Get aggregated exposure percentage for a ticker at group level.
 * This is a convenience function that returns just the number.
 */
export function getGroupExposure(
  holdings: Holding[],
  ticker: string
): number {
  const result = calculateExposure(holdings, ticker, "GROUP");
  return typeof result === "number" ? result : 0;
}

/**
 * Get fund-level exposures for a ticker.
 * Returns a map of fundId -> exposure percentage.
 */
export function getFundExposures(
  holdings: Holding[],
  ticker: string
): Map<string, number> {
  const result = calculateExposure(holdings, ticker, "FUND");
  return result instanceof Map ? result : new Map();
}

