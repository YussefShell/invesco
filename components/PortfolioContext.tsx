"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import type { Holding, AssetData } from "@/types";
import { regulatoryRules } from "@/lib/mock-data";
import { useRisk } from "@/components/RiskContext";

interface PortfolioContextValue {
  holdings: Holding[];
  selectedTicker: string | null;
  simulateMarketPriceDrop: boolean;
  setSelectedTicker: (ticker: string | null) => void;
  updateHolding: (ticker: string, updates: Partial<Holding>) => void;
  setSimulateMarketPriceDrop: (value: boolean) => void;
}

const PortfolioContext = createContext<PortfolioContextValue | undefined>(
  undefined
);

const TOTAL_SHARES_DEFAULT = 100_000_000;

// Function to create initial holdings - called on client side to avoid hydration issues
const createInitialHoldings = (): Holding[] => {
  const NOW = Date.now();

  // Start with a small set of handcrafted, realistic seed holdings
  const seedHoldings: Holding[] = [
    {
      id: "1",
      ticker: "NVDA",
      issuer: "NVIDIA Corp",
      isin: "US67066G1040",
      jurisdiction: "USA",
      sharesOwned: TOTAL_SHARES_DEFAULT * 0.052,
      totalSharesOutstanding: TOTAL_SHARES_DEFAULT,
      buyingVelocity: 12_500,
      regulatoryRule: regulatoryRules[0],
      lastUpdated: new Date(NOW - 30 * 1000).toISOString(), // < 1 minute (fresh)
    },
    {
      id: "2",
      ticker: "0700.HK",
      issuer: "Tencent Holdings Ltd",
      isin: "KYG875721634",
      jurisdiction: "Hong Kong",
      sharesOwned: TOTAL_SHARES_DEFAULT * 0.048,
      totalSharesOutstanding: TOTAL_SHARES_DEFAULT,
      buyingVelocity: 8_500,
      regulatoryRule: regulatoryRules[3],
      lastUpdated: new Date(NOW - 20 * 60 * 1000).toISOString(), // > 15 minutes (stale)
    },
    {
      id: "3",
      ticker: "RIO",
      issuer: "Rio Tinto Group",
      isin: "GB0007188757",
      jurisdiction: "UK",
      sharesOwned: TOTAL_SHARES_DEFAULT * 0.031,
      totalSharesOutstanding: TOTAL_SHARES_DEFAULT,
      buyingVelocity: 3_200,
      regulatoryRule: regulatoryRules[2],
      lastUpdated: new Date(NOW - 70 * 60 * 1000).toISOString(), // > 1 hour (feed error)
    },
    {
      id: "4",
      ticker: "AAPL",
      issuer: "Apple Inc",
      isin: "US0378331005",
      jurisdiction: "USA",
      sharesOwned: TOTAL_SHARES_DEFAULT * 0.046,
      totalSharesOutstanding: TOTAL_SHARES_DEFAULT,
      buyingVelocity: 15_200,
      regulatoryRule: regulatoryRules[1],
      lastUpdated: new Date(NOW - 2 * 60 * 1000).toISOString(),
    },
    {
      id: "5",
      ticker: "HSBA",
      issuer: "HSBC Holdings plc",
      isin: "GB0005405286",
      jurisdiction: "UK",
      sharesOwned: TOTAL_SHARES_DEFAULT * 0.027,
      totalSharesOutstanding: TOTAL_SHARES_DEFAULT,
      buyingVelocity: 1_800,
      regulatoryRule: regulatoryRules[2],
      lastUpdated: new Date(NOW - 10 * 60 * 1000).toISOString(),
    },
    {
      id: "6",
      ticker: "BABA",
      issuer: "Alibaba Group Holding Ltd",
      isin: "US01609W1027",
      jurisdiction: "USA",
      sharesOwned: TOTAL_SHARES_DEFAULT * 0.0495,
      totalSharesOutstanding: TOTAL_SHARES_DEFAULT,
      buyingVelocity: 9_800,
      regulatoryRule: regulatoryRules[0],
      lastUpdated: new Date(NOW - 40 * 60 * 1000).toISOString(), // > 30 minutes
    },
    {
      id: "7",
      ticker: "005930.KS",
      issuer: "Samsung Electronics Co Ltd",
      isin: "KR7005930003",
      jurisdiction: "APAC",
      sharesOwned: TOTAL_SHARES_DEFAULT * 0.042,
      totalSharesOutstanding: TOTAL_SHARES_DEFAULT,
      buyingVelocity: 4_200,
      regulatoryRule: {
        code: "K-SD",
        name: "Korea Securities Disclosure",
        description: "Crossed 5% ownership threshold",
        threshold: 5.0,
        jurisdiction: "APAC",
      },
      lastUpdated: new Date(NOW - 5 * 60 * 1000).toISOString(),
    },
    {
      id: "8",
      ticker: "MSFT",
      issuer: "Microsoft Corporation",
      isin: "US5949181045",
      jurisdiction: "USA",
      sharesOwned: TOTAL_SHARES_DEFAULT * 0.0515,
      totalSharesOutstanding: TOTAL_SHARES_DEFAULT,
      buyingVelocity: 11_200,
      regulatoryRule: regulatoryRules[1],
      lastUpdated: new Date(NOW - 55 * 60 * 1000).toISOString(),
    },
  ];

  // Expand the seed data into a large synthetic universe so the UI can be
  // stress‑tested with thousands of positions while still looking realistic.
  const expandedHoldings: Holding[] = [...seedHoldings];

  const jurisdictionsCycle: Holding["jurisdiction"][] = [
    "USA",
    "UK",
    "Hong Kong",
    "APAC",
  ];

  const getRuleForJurisdiction = (jurisdiction: Holding["jurisdiction"]) => {
    // Try to find a rule for the jurisdiction, otherwise fall back to the first rule
    const rule =
      regulatoryRules.find((r) => r.jurisdiction === jurisdiction) ||
      regulatoryRules[0];
    return rule;
  };

  const TARGET_COUNT = 1500; // total number of synthetic holdings to generate

  for (let i = seedHoldings.length; i < TARGET_COUNT; i++) {
    const seed = seedHoldings[i % seedHoldings.length];
    const jurisdiction =
      jurisdictionsCycle[i % jurisdictionsCycle.length] ?? "USA";

    // Ownership between ~2% and ~7%, clustered around each jurisdiction's thresholds
    const basePct = 0.02 + Math.random() * 0.05;
    const sharesOwned = TOTAL_SHARES_DEFAULT * basePct;

    // Buying velocity between 500 and 20k shares/hr with some randomisation
    const buyingVelocity =
      500 +
      Math.round(
        (Math.abs(Math.sin(i * 1.37)) + Math.random()) * 9_750 // 500–~20k
      ) *
        2;

    const lastUpdatedOffsetMinutes = Math.floor(Math.random() * 120); // up to 2 hours ago

    expandedHoldings.push({
      id: String(i + 1),
      ticker: `${seed.ticker}-${i + 1}`,
      issuer: `${seed.issuer} Synthetic ${i + 1}`,
      isin: `SYNTH${(i + 1).toString().padStart(8, "0")}`,
      jurisdiction,
      sharesOwned,
      totalSharesOutstanding: TOTAL_SHARES_DEFAULT,
      buyingVelocity,
      regulatoryRule: getRuleForJurisdiction(jurisdiction),
      lastUpdated: new Date(
        NOW - lastUpdatedOffsetMinutes * 60 * 1000
      ).toISOString(),
      // price is populated later by adapters; we intentionally leave it undefined here
    });
  }

  return expandedHoldings;
};

export const PortfolioProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  // Initialize holdings on client side only to avoid hydration mismatch
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>("NVDA");
  const [simulateMarketPriceDrop, setSimulateMarketPriceDrop] =
    useState<boolean>(false);
  
  // Get data provider from RiskContext for real-time price updates
  const { dataProvider, connectionStatus } = useRisk();
  
  // Track base values and time for realistic updates
  const baseHoldingsRef = useRef<Map<string, { baseShares: number; baseVelocity: number; startTime: number }>>(new Map());
  
  // Track real-time price data from adapter
  const realTimePricesRef = useRef<Map<string, AssetData>>(new Map());
  
  // Initialize holdings on client side
  useEffect(() => {
    if (holdings.length === 0) {
      const initialHoldings = createInitialHoldings();
      setHoldings(initialHoldings);
      initialHoldings.forEach((holding) => {
        baseHoldingsRef.current.set(holding.id, {
          baseShares: holding.sharesOwned,
          baseVelocity: holding.buyingVelocity,
          startTime: Date.now(),
        });
      });
    }
  }, [holdings.length]);

  // Subscribe to real-time price updates from the data provider
  useEffect(() => {
    if (!dataProvider || connectionStatus !== "connected" || holdings.length === 0) return;
    
    // Create a callback that updates holdings when price data arrives
    const priceUpdateCallbacks = new Map<string, (assetData: AssetData) => void>();
    
    // Subscribe to all holdings for real-time price updates
    holdings.forEach((holding) => {
      // Only subscribe once per ticker
      if (priceUpdateCallbacks.has(holding.ticker)) return;
      
      const callback = (assetData: AssetData) => {
        // Update real-time price cache
        realTimePricesRef.current.set(holding.ticker, assetData);
        
        // Update holding with real-time price and position data
        setHoldings((prev) =>
          prev.map((h) => {
            if (h.ticker === holding.ticker) {
              return {
                ...h,
                lastUpdated: assetData.lastUpdated,
                // Store real-time price
                price: assetData.price,
                // Update shares based on position percentage if available
                ...(assetData.currentPosition !== undefined && {
                  sharesOwned: (h.totalSharesOutstanding * assetData.currentPosition) / 100,
                }),
              };
            }
            return h;
          })
        );
      };
      
      priceUpdateCallbacks.set(holding.ticker, callback);
      dataProvider.subscribeToTicker(holding.ticker, callback);
    });
    
    // Cleanup: Note that adapters handle their own cleanup via dispose()
    // This effect will re-run if dataProvider or holdings change
  }, [dataProvider, connectionStatus, holdings.map(h => h.ticker).join(',')]);
  
  // Initialize base values
  useEffect(() => {
    if (holdings.length === 0) return;
    holdings.forEach((holding) => {
      if (!baseHoldingsRef.current.has(holding.id)) {
        baseHoldingsRef.current.set(holding.id, {
          baseShares: holding.sharesOwned,
          baseVelocity: holding.buyingVelocity,
          startTime: Date.now(),
        });
      }
    });
  }, [holdings]);

  // Real-time updates: gradually increase shares based on buying velocity
  // and add realistic fluctuations
  useEffect(() => {
    if (holdings.length === 0) return;
    
    const interval = setInterval(() => {
      setHoldings((prev) =>
        prev.map((holding) => {
          const base = baseHoldingsRef.current.get(holding.id);
          if (!base) return holding;

          const now = Date.now();
          const elapsedHours = (now - base.startTime) / (1000 * 60 * 60);
          
          // Calculate new shares based on buying velocity (shares per hour)
          // Add some realistic variation (±10% in velocity)
          const velocityVariation = 1 + (Math.random() - 0.5) * 0.2; // ±10%
          const effectiveVelocity = base.baseVelocity * velocityVariation;
          
          // Gradually increase shares based on velocity
          const sharesAdded = effectiveVelocity * elapsedHours;
          const newShares = base.baseShares + sharesAdded;
          
          // Add small random fluctuations (±0.1% of total)
          const fluctuation = (Math.random() - 0.5) * TOTAL_SHARES_DEFAULT * 0.001;
          const finalShares = Math.max(0, newShares + fluctuation);
          
          // Update buying velocity with slight variations (±5%)
          const velocityChange = (Math.random() - 0.5) * 0.1;
          const newVelocity = Math.max(100, base.baseVelocity * (1 + velocityChange));
          
          // Update base velocity periodically (every 5 minutes of simulation)
          if (elapsedHours > 0.083) { // ~5 minutes
            base.baseVelocity = newVelocity;
            base.startTime = now;
            base.baseShares = finalShares;
          }
          
          // Update timestamp - some holdings update more frequently than others
          // to simulate real-world feed variations
          const updateInterval = holding.jurisdiction === "USA" ? 15 : 30; // USA updates every 15s, others 30s
          const shouldUpdate = Math.random() < (updateInterval / 60); // Probability based on interval
          
          return {
            ...holding,
            sharesOwned: finalShares,
            buyingVelocity: newVelocity,
            lastUpdated: shouldUpdate 
              ? new Date().toISOString() 
              : holding.lastUpdated,
          };
        })
      );
    }, 2000); // Update every 2 seconds for smooth real-time feel

    return () => clearInterval(interval);
  }, [holdings.length]);

  const updateHolding = (ticker: string, updates: Partial<Holding>) => {
    setHoldings((prev) =>
      prev.map((h) =>
        h.ticker === ticker
          ? {
              ...h,
              ...updates,
            }
          : h
      )
    );
  };

  const value: PortfolioContextValue = useMemo(
    () => ({
      holdings,
      selectedTicker,
      simulateMarketPriceDrop,
      setSelectedTicker,
      updateHolding,
      setSimulateMarketPriceDrop,
    }),
    [holdings, selectedTicker, simulateMarketPriceDrop]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = (): PortfolioContextValue => {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return ctx;
};


