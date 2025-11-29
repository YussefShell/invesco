"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { historicalDataStore } from "@/lib/historical-data-store";
import type { Holding, TrendDataPoint, Jurisdiction } from "@/types";
import { usePortfolio } from "./PortfolioContext";

interface HistoricalDataContextValue {
  recordSnapshot: () => void;
  recordTrendPoint: () => void;
  getStatistics: () => ReturnType<typeof historicalDataStore.getStatistics>;
}

const HistoricalDataContext = createContext<HistoricalDataContextValue | undefined>(
  undefined
);

export const HistoricalDataProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const { holdings } = usePortfolio();
  const snapshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trendIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Record holding snapshots periodically
  const recordSnapshot = useCallback(() => {
    if (holdings.length > 0) {
      historicalDataStore.recordHoldingSnapshot(holdings);
    }
  }, [holdings]);

  // Record trend data points periodically
  const recordTrendPoint = useCallback(() => {
    if (holdings.length === 0) return;

    // Calculate current metrics
    let totalBreaches = 0;
    let totalWarnings = 0;
    let totalSafe = 0;
    let totalOwnership = 0;
    let totalVelocity = 0;

    const byJurisdiction: Record<Jurisdiction, {
      breaches: number;
      warnings: number;
      safe: number;
    }> = {
      USA: { breaches: 0, warnings: 0, safe: 0 },
      UK: { breaches: 0, warnings: 0, safe: 0 },
      "Hong Kong": { breaches: 0, warnings: 0, safe: 0 },
      APAC: { breaches: 0, warnings: 0, safe: 0 },
      Other: { breaches: 0, warnings: 0, safe: 0 },
    };

    holdings.forEach((holding) => {
      const ownershipPercent =
        (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
      const threshold = holding.regulatoryRule.threshold;
      const warningMin = threshold * 0.9;

      let status: "breach" | "warning" | "safe" = "safe";
      if (ownershipPercent >= threshold) {
        status = "breach";
        totalBreaches++;
        byJurisdiction[holding.jurisdiction].breaches++;
      } else if (ownershipPercent >= warningMin && ownershipPercent < threshold) {
        status = "warning";
        totalWarnings++;
        byJurisdiction[holding.jurisdiction].warnings++;
      } else {
        totalSafe++;
        byJurisdiction[holding.jurisdiction].safe++;
      }

      totalOwnership += ownershipPercent;
      totalVelocity += holding.buyingVelocity;
    });

    const avgOwnershipPercent = holdings.length > 0 ? totalOwnership / holdings.length : 0;
    const avgBuyingVelocity = holdings.length > 0 ? totalVelocity / holdings.length : 0;

    historicalDataStore.recordTrendDataPoint({
      totalBreaches,
      totalWarnings,
      totalSafe,
      byJurisdiction,
      avgOwnershipPercent,
      avgBuyingVelocity,
    });
  }, [holdings]);

  // Start periodic collection
  useEffect(() => {
    // Record initial snapshot
    recordSnapshot();
    recordTrendPoint();

    // Set up intervals
    snapshotIntervalRef.current = setInterval(() => {
      recordSnapshot();
    }, 60000); // Every 60 seconds

    trendIntervalRef.current = setInterval(() => {
      recordTrendPoint();
    }, 300000); // Every 5 minutes

    return () => {
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
      }
      if (trendIntervalRef.current) {
        clearInterval(trendIntervalRef.current);
      }
    };
  }, [recordSnapshot, recordTrendPoint]);

  const value: HistoricalDataContextValue = {
    recordSnapshot,
    recordTrendPoint,
    getStatistics: () => historicalDataStore.getStatistics(),
  };

  return (
    <HistoricalDataContext.Provider value={value}>
      {children}
    </HistoricalDataContext.Provider>
  );
};

export const useHistoricalData = (): HistoricalDataContextValue => {
  const ctx = useContext(HistoricalDataContext);
  if (!ctx) {
    throw new Error("useHistoricalData must be used within a HistoricalDataProvider");
  }
  return ctx;
};

