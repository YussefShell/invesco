/**
 * Compliance Engine - Recursive ETF Look-Through Logic
 * 
 * This module implements Level 3 compliance by calculating "True Regulatory Risk"
 * through recursive decomposition of ETF holdings into their constituents.
 * 
 * Problem: Standard systems fail to track "Hidden Exposure" (e.g., owning Apple
 * stock indirectly via the S&P 500 ETF). This engine explodes ETF holdings into
 * their constituents to calculate the True Regulatory Risk.
 */

import type { Holding } from "@/types";
import { ETF_CONSTITUENTS, isETF, type ETFConstituent } from "@/lib/data/etf-universe";
import { calculateDeltaAdjustedExposure } from "@/lib/calculation-utils";

/**
 * Breakdown of exposure from a single source (direct or indirect via ETF)
 */
export interface ExposureBreakdown {
  source: "direct" | "etf";
  etfTicker?: string; // Only present if source is "etf"
  shares: number;
  percentage: number;
}

/**
 * Result of true exposure calculation
 */
export interface TrueExposureResult {
  ticker: string;
  directShares: number;
  indirectShares: number;
  totalShares: number;
  totalSharesOutstanding: number;
  directPercentage: number;
  totalPercentage: number;
  breakdown: ExposureBreakdown[];
  isBreach: boolean;
  threshold: number;
}

/**
 * Calculate True Exposure for a ticker by looking through ETFs
 * 
 * Algorithm:
 * 1. Find Direct Holdings: Shares of the ticker directly owned
 * 2. Find Indirect Holdings:
 *    - Loop through all other assets in the portfolio
 *    - If an asset is an ETF (exists in ETF_CONSTITUENTS), calculate look-through exposure
 *    - Formula: Indirect Shares = (Shares of ETF Owned * Weight of Stock in ETF)
 * 3. Summation: Total Risk = Direct Shares + Indirect Shares
 * 
 * @param ticker - The stock ticker to calculate exposure for (e.g., "AAPL")
 * @param portfolio - All holdings in the portfolio (including ETFs)
 * @returns TrueExposureResult with breakdown of direct and indirect exposure
 */
export function calculateTrueExposure(
  ticker: string,
  portfolio: Holding[]
): TrueExposureResult {
  // Step 1: Find direct holdings
  const directHoldings = portfolio.filter(
    (h) => h.ticker === ticker && !isETF(h.ticker)
  );

  let directShares = 0;
  let totalSharesOutstanding = 0;

  // Calculate direct shares (using delta-adjusted exposure for accuracy)
  directHoldings.forEach((holding) => {
    directShares += calculateDeltaAdjustedExposure(holding);
    // Use the first holding's totalSharesOutstanding as reference
    // (should be consistent across all holdings of the same ticker)
    if (totalSharesOutstanding === 0) {
      totalSharesOutstanding = holding.totalSharesOutstanding;
    }
  });

  // If no direct holdings, try to get totalSharesOutstanding from any holding
  // that might have this ticker (could be in an ETF's metadata)
  if (totalSharesOutstanding === 0) {
    const anyHolding = portfolio.find((h) => h.ticker === ticker);
    if (anyHolding) {
      totalSharesOutstanding = anyHolding.totalSharesOutstanding;
    }
  }

  // Step 2: Find indirect holdings via ETFs
  const breakdown: ExposureBreakdown[] = [];
  let indirectShares = 0;

  // Create breakdown entry for direct holdings
  if (directShares > 0 && totalSharesOutstanding > 0) {
    breakdown.push({
      source: "direct",
      shares: directShares,
      percentage: (directShares / totalSharesOutstanding) * 100,
    });
  }

  // Loop through all holdings to find ETFs
  portfolio.forEach((holding) => {
    const holdingTicker = holding.ticker;
    
    // Skip if this is the ticker we're calculating for (already counted as direct)
    if (holdingTicker === ticker) {
      return;
    }

    // Check if this holding is an ETF
    if (isETF(holdingTicker)) {
      const constituents = ETF_CONSTITUENTS[holdingTicker];
      const constituent = constituents.find((c) => c.ticker === ticker);

      if (constituent) {
        // Calculate ETF shares owned (delta-adjusted)
        const etfSharesOwned = calculateDeltaAdjustedExposure(holding);
        const etfTotalSharesOutstanding = holding.totalSharesOutstanding;
        
        // Calculate what percentage of the ETF we own
        const etfOwnershipPercent = etfTotalSharesOutstanding > 0
          ? etfSharesOwned / etfTotalSharesOutstanding
          : 0;
        
        // Calculate indirect shares via this ETF
        // Formula: 
        // 1. We own X% of the ETF
        // 2. The ETF has Y% of its NAV in the constituent (weight)
        // 3. The ETF's total value represents some portion of the constituent's market cap
        // 
        // Simplified approach for demo:
        // Indirect shares = (ETF shares owned / ETF total shares) * weight * constituent total shares
        // This assumes the ETF's NAV is proportional to the constituent's market cap
        const indirectSharesViaETF = totalSharesOutstanding > 0
          ? etfOwnershipPercent * constituent.weight * totalSharesOutstanding
          : 0;
        
        indirectShares += indirectSharesViaETF;

        // Add to breakdown if we have totalSharesOutstanding
        if (totalSharesOutstanding > 0 && indirectSharesViaETF > 0) {
          breakdown.push({
            source: "etf",
            etfTicker: holdingTicker,
            shares: indirectSharesViaETF,
            percentage: (indirectSharesViaETF / totalSharesOutstanding) * 100,
          });
        }
      }
    }
  });

  // Step 3: Calculate totals
  const totalShares = directShares + indirectShares;
  const directPercentage = totalSharesOutstanding > 0 
    ? (directShares / totalSharesOutstanding) * 100 
    : 0;
  const totalPercentage = totalSharesOutstanding > 0 
    ? (totalShares / totalSharesOutstanding) * 100 
    : 0;

  // Get threshold from first direct holding (or from any holding if no direct)
  const referenceHolding = directHoldings[0] || portfolio.find((h) => h.ticker === ticker);
  const threshold = referenceHolding?.regulatoryRule?.threshold || 5.0;

  return {
    ticker,
    directShares,
    indirectShares,
    totalShares,
    totalSharesOutstanding,
    directPercentage,
    totalPercentage,
    breakdown,
    isBreach: totalPercentage >= threshold,
    threshold,
  };
}

/**
 * Check if a ticker has any hidden exposure (indirect via ETFs)
 */
export function hasHiddenExposure(ticker: string, portfolio: Holding[]): boolean {
  const result = calculateTrueExposure(ticker, portfolio);
  return result.indirectShares > 0;
}

