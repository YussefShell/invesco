"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { historicalDataStore } from "@/lib/historical-data-store";
import { calculateDeltaAdjustedExposure } from "@/lib/calculation-utils";
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
  const holdingsRef = useRef(holdings);

  // Record holding snapshots periodically
  const recordSnapshot = useCallback(() => {
    const currentHoldings = holdingsRef.current;
    if (currentHoldings.length > 0) {
      historicalDataStore.recordHoldingSnapshot(currentHoldings);
    }
  }, []);

  // Record trend data points periodically
  const recordTrendPoint = useCallback(() => {
    const currentHoldings = holdingsRef.current;
    if (currentHoldings.length === 0) return;

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

    currentHoldings.forEach((holding) => {
      // Use delta-adjusted exposure for consistency with rest of codebase
      const totalExposure = calculateDeltaAdjustedExposure(holding);
      const ownershipPercent =
        (totalExposure / holding.totalSharesOutstanding) * 100;
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

    const avgOwnershipPercent = currentHoldings.length > 0 ? totalOwnership / currentHoldings.length : 0;
    const avgBuyingVelocity = currentHoldings.length > 0 ? totalVelocity / currentHoldings.length : 0;

    historicalDataStore.recordTrendDataPoint({
      totalBreaches,
      totalWarnings,
      totalSafe,
      byJurisdiction,
      avgOwnershipPercent,
      avgBuyingVelocity,
    });
  }, []);

  // Keep holdings ref up to date and record snapshot when holdings first become available
  useEffect(() => {
    const hadHoldings = holdingsRef.current.length > 0;
    holdingsRef.current = holdings;
    
    // If holdings just became available (were empty, now have data), record immediately
    if (!hadHoldings && holdings.length > 0) {
      recordSnapshot();
      recordTrendPoint();
    }
  }, [holdings, recordSnapshot, recordTrendPoint]);

  // Start periodic collection and initialize store (loads from localStorage)
  useEffect(() => {
    // Initialize the store (loads persisted data from localStorage)
    historicalDataStore.start();

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
      // Stop store and save data before unmounting
      historicalDataStore.stop();
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


