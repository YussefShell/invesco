"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/components/contexts/PortfolioContext";
import { calculateBreachTime } from "@/lib/mock-data";
import { evaluateRisk, checkDenominatorConfidence } from "@/lib/compliance-rules-engine";
import { calculateDeltaAdjustedExposure } from "@/lib/calculation-utils";
import type { Holding, BreachCalculation } from "@/types";

export interface RiskCalculatorResult {
  holding: Holding | null;
  ownershipPercent: number | null;
  breach: BreachCalculation | null;
  compliance:
    | ReturnType<typeof evaluateRisk>
    | null;
  /**
   * Delta-adjusted total exposure including options positions.
   */
  totalExposure?: number;
  /**
   * Whether data quality warning is active (denominator confidence check failed).
   */
  hasDataQualityWarning?: boolean;
}

export function useRiskCalculator(ticker: string | null): RiskCalculatorResult {
  const { holdings, simulateMarketPriceDrop } = usePortfolio();

  return useMemo(() => {
    if (!ticker) {
      return {
        holding: null,
        ownershipPercent: null,
        breach: null,
        compliance: null,
        totalExposure: undefined,
        hasDataQualityWarning: false,
      };
    }

    const holding = holdings.find((h) => h.ticker === ticker) ?? null;
    if (!holding) {
      return {
        holding: null,
        ownershipPercent: null,
        breach: null,
        compliance: null,
        totalExposure: undefined,
        hasDataQualityWarning: false,
      };
    }

    // Calculate delta-adjusted exposure (includes options)
    const baseTotalExposure = calculateDeltaAdjustedExposure(holding);
    const effectiveTotalExposure = simulateMarketPriceDrop
      ? baseTotalExposure * 1.1
      : baseTotalExposure;

    // Check denominator confidence before calculating risk
    const denominatorCheck = checkDenominatorConfidence(
      holding.totalShares_Bloomberg,
      holding.totalShares_Refinitiv,
      holding.totalSharesOutstanding
    );

    // Use the most reliable totalSharesOutstanding value
    // If both Bloomberg and Refinitiv are available and match closely, use their average
    // Otherwise, use the primary totalSharesOutstanding
    let denominatorForCalculation = holding.totalSharesOutstanding;
    if (
      holding.totalShares_Bloomberg &&
      holding.totalShares_Refinitiv &&
      !denominatorCheck.hasWarning
    ) {
      // Use average when both sources agree (within 1%)
      denominatorForCalculation =
        (holding.totalShares_Bloomberg + holding.totalShares_Refinitiv) / 2;
    } else if (holding.totalShares_Bloomberg) {
      denominatorForCalculation = holding.totalShares_Bloomberg;
    } else if (holding.totalShares_Refinitiv) {
      denominatorForCalculation = holding.totalShares_Refinitiv;
    }

    const ownershipPercent =
      (effectiveTotalExposure / denominatorForCalculation) * 100;

    const pseudoPosition = {
      id: holding.id,
      issuer: holding.issuer,
      isin: holding.isin,
      jurisdiction: holding.jurisdiction,
      currentPosition: ownershipPercent,
      threshold: holding.regulatoryRule.threshold,
      buyingVelocity: holding.buyingVelocity,
      regulatoryRule: holding.regulatoryRule,
    };

    // Use updated formula with delta-adjusted exposure and total shares outstanding
    const breach = calculateBreachTime(
      pseudoPosition,
      effectiveTotalExposure,
      denominatorForCalculation
    );
    const compliance = evaluateRisk(
      holding.jurisdiction,
      ownershipPercent,
      "long",
      denominatorCheck.hasWarning
    );

    return {
      holding,
      ownershipPercent,
      breach,
      compliance,
      totalExposure: effectiveTotalExposure,
      hasDataQualityWarning: denominatorCheck.hasWarning,
    };
  }, [holdings, simulateMarketPriceDrop, ticker]);
}



