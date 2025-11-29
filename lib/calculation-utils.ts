import type { Holding } from "@/types";

/**
 * Calculate delta-adjusted exposure including derivative positions.
 * Formula: TotalExposure = sharesOwned + (Sum of: contracts * 100 * delta)
 * This accounts for 'Beneficial Ownership' of options.
 * 
 * This is a pure utility function that can be used in both client and server contexts.
 */
export function calculateDeltaAdjustedExposure(holding: Holding): number {
  let totalExposure = holding.sharesOwned;

  // Add derivative positions (options) exposure
  if (holding.derivativePositions && holding.derivativePositions.length > 0) {
    const derivativeExposure = holding.derivativePositions.reduce((sum, pos) => {
      // Each contract represents 100 shares, adjusted by delta
      return sum + (pos.contracts * 100 * pos.delta);
    }, 0);
    totalExposure += derivativeExposure;
  }

  return totalExposure;
}

