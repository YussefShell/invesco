"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/components/PortfolioContext";
import { calculateBreachTime } from "@/lib/mock-data";
import { evaluateRisk } from "@/lib/compliance-rules-engine";
import type { Holding, BreachCalculation } from "@/types";

export interface RiskCalculatorResult {
  holding: Holding | null;
  ownershipPercent: number | null;
  breach: BreachCalculation | null;
  compliance:
    | ReturnType<typeof evaluateRisk>
    | null;
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
      };
    }

    const holding = holdings.find((h) => h.ticker === ticker) ?? null;
    if (!holding) {
      return {
        holding: null,
        ownershipPercent: null,
        breach: null,
        compliance: null,
      };
    }

    const effectiveSharesOwned = simulateMarketPriceDrop
      ? holding.sharesOwned * 1.1
      : holding.sharesOwned;

    const ownershipPercent =
      (effectiveSharesOwned / holding.totalSharesOutstanding) * 100;

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

    const breach = calculateBreachTime(pseudoPosition);
    const compliance = evaluateRisk(
      holding.jurisdiction,
      ownershipPercent,
      "long"
    );

    return {
      holding,
      ownershipPercent,
      breach,
      compliance,
    };
  }, [holdings, simulateMarketPriceDrop, ticker]);
}


