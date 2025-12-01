"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import type { Holding, AssetData } from "@/types";
import { regulatoryRules, getRealisticSharesOutstanding } from "@/lib/mock-data";
import { useRisk } from "@/components/contexts/RiskContext";
import { checkDenominatorConfidence } from "@/lib/compliance-rules-engine";
import { updateStaleSharesOutstanding } from "@/lib/services/shares-outstanding-service";

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
  // Entity Aggregation Demo: NVIDIA holdings split across two funds
  const seedHoldings: Holding[] = [
    {
      id: "1",
      ticker: "NVDA",
      issuer: "NVIDIA Corp",
      isin: "US67066G1040",
      jurisdiction: "USA",
      // Real-world: NVDA has ~2.46 billion shares outstanding (as of 2024)
      sharesOwned: 2_460_000_000 * 0.028, // 68.88M shares = 2.8% - Invesco Tech ETF
      totalSharesOutstanding: 2_460_000_000, // Will be updated from SEC API (US ticker)
      buyingVelocity: 12_500,
      regulatoryRule: regulatoryRules[0],
      lastUpdated: new Date(NOW - 30 * 1000).toISOString(), // < 1 minute (fresh)
      fundId: "INV-TECH-ETF",
      parentId: "INVESCO-GROUP",
      // Flash Recon: Data matches
      lastReconTimestamp: new Date(NOW - 45 * 60 * 1000).toISOString(), // 45 minutes ago
      reconStatus: 'MATCH',
      // Bloomberg and Refinitiv values will be fetched from SEC API
      // Delta-adjusted exposure: Include some options
      derivativePositions: [
        {
          type: 'CALL',
          contracts: 25000, // 25,000 call option contracts
          delta: 0.58, // 58% delta
        },
      ],
      // Total delta-adjusted exposure:
      // sharesOwned + (25,000 * 100 * 0.58) = 68.88M + 1.45M = 70.33M shares
    },
    {
      id: "1b",
      ticker: "NVDA",
      issuer: "NVIDIA Corp",
      isin: "US67066G1040",
      jurisdiction: "USA",
      // Real-world: NVDA has ~2.46 billion shares outstanding (as of 2024)
      sharesOwned: 2_460_000_000 * 0.023, // 56.58M shares = 2.3% - Invesco Global Growth
      totalSharesOutstanding: 2_460_000_000, // Will be updated from SEC API (US ticker)
      buyingVelocity: 8_000,
      regulatoryRule: regulatoryRules[0],
      lastUpdated: new Date(NOW - 45 * 1000).toISOString(),
      fundId: "INV-GLOBAL-GROWTH",
      parentId: "INVESCO-GROUP",
      // Bloomberg and Refinitiv values will be fetched from SEC API
    },
    {
      id: "2",
      ticker: "0700.HK",
      issuer: "Tencent Holdings Ltd",
      isin: "KYG875721634",
      jurisdiction: "Hong Kong",
      // Real-world: Tencent has ~9.52 billion shares outstanding (as of 2024)
      // NOTE: Non-US ticker (.HK) - data is hardcoded (SEC API only supports US-listed companies)
      sharesOwned: 9_520_000_000 * 0.048, // 456.96M shares = 4.8%
      totalSharesOutstanding: 9_520_000_000, // Hardcoded: ~9.52B shares outstanding
      buyingVelocity: 8_500,
      regulatoryRule: regulatoryRules[3],
      lastUpdated: new Date(NOW - 20 * 60 * 1000).toISOString(), // > 15 minutes (stale)
      // Hardcoded values for non-US ticker (SEC API doesn't support international exchanges)
      totalShares_Bloomberg: 9_510_000_000,
      totalShares_Refinitiv: 9_530_000_000,
    },
    {
      id: "3",
      ticker: "RIO",
      issuer: "Rio Tinto Group",
      isin: "GB0007188757",
      jurisdiction: "UK",
      // Real-world: Rio Tinto has ~1.63 billion shares outstanding (as of 2024)
      // NOTE: Non-US ticker (UK-listed) - data is hardcoded (SEC API only supports US-listed companies)
      sharesOwned: 1_630_000_000 * 0.031, // 50.53M shares = 3.1%
      totalSharesOutstanding: 1_630_000_000, // Hardcoded: ~1.63B shares outstanding
      buyingVelocity: 3_200,
      regulatoryRule: regulatoryRules[2],
      lastUpdated: new Date(NOW - 70 * 60 * 1000).toISOString(), // > 1 hour (feed error)
      // Hardcoded values for non-US ticker (SEC API doesn't support international exchanges)
      totalShares_Bloomberg: 1_625_000_000,
      totalShares_Refinitiv: 1_635_000_000,
    },
    {
      id: "4",
      ticker: "AAPL",
      issuer: "Apple Inc",
      isin: "US0378331005",
      jurisdiction: "USA",
      // Real-world: AAPL has ~15.5 billion shares outstanding (as of 2024)
      // For demo: 4.8% direct holding = 744M shares (appears safe, below 5% threshold)
      sharesOwned: 15_500_000_000 * 0.048, // 744,000,000 shares = 4.8%
      totalSharesOutstanding: 15_500_000_000, // Will be updated from SEC API (US ticker)
      buyingVelocity: 15_200,
      regulatoryRule: regulatoryRules[1],
      lastUpdated: new Date(NOW - 2 * 60 * 1000).toISOString(),
      // Bloomberg and Refinitiv values will be fetched from SEC API
      assetStatus: 'OK',
      // Flash Recon: Data matches
      lastReconTimestamp: new Date(NOW - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      reconStatus: 'MATCH',
      // Delta-adjusted exposure: Include options positions
      derivativePositions: [
        {
          type: 'CALL',
          contracts: 50000, // 50,000 call option contracts
          delta: 0.65, // 65% delta
        },
        {
          type: 'PUT',
          contracts: 10000, // 10,000 put option contracts (reduces exposure)
          delta: -0.35, // -35% delta (negative because puts reduce exposure)
        },
      ],
      // Total delta-adjusted exposure calculation:
      // sharesOwned + (50,000 * 100 * 0.65) + (10,000 * 100 * -0.35)
      // = 744M + 3.25M - 0.35M = 746.9M shares (delta-adjusted)
    },
    {
      id: "5",
      ticker: "HSBA",
      issuer: "HSBC Holdings plc",
      isin: "GB0005405286",
      jurisdiction: "UK",
      // Real-world: HSBC has ~19.2 billion shares outstanding (as of 2024)
      // NOTE: Non-US ticker - data is hardcoded (SEC API only supports US-listed companies)
      sharesOwned: 19_200_000_000 * 0.027, // 518.4M shares = 2.7%
      totalSharesOutstanding: 19_200_000_000, // Hardcoded: ~19.2B shares outstanding
      buyingVelocity: 1_800,
      regulatoryRule: regulatoryRules[2],
      lastUpdated: new Date(NOW - 10 * 60 * 1000).toISOString(),
      // Hardcoded values for non-US ticker (SEC API doesn't support international exchanges)
      totalShares_Bloomberg: 19_180_000_000,
      totalShares_Refinitiv: 19_220_000_000,
    },
    {
      id: "6",
      ticker: "BABA",
      issuer: "Alibaba Group Holding Ltd",
      isin: "US01609W1027",
      jurisdiction: "USA",
      // Real-world: Alibaba has ~2.1 billion shares outstanding (as of 2024)
      sharesOwned: 2_100_000_000 * 0.0495, // 103.95M shares = 4.95%
      totalSharesOutstanding: 2_100_000_000, // Will be updated from SEC API (US ticker)
      buyingVelocity: 9_800,
      regulatoryRule: regulatoryRules[0],
      lastUpdated: new Date(NOW - 40 * 60 * 1000).toISOString(), // > 30 minutes
      // Bloomberg and Refinitiv values will be fetched from SEC API
    },
    {
      id: "7",
      ticker: "005930.KS",
      issuer: "Samsung Electronics Co Ltd",
      isin: "KR7005930003",
      jurisdiction: "APAC",
      // Real-world: Samsung Electronics has ~596 million shares outstanding (as of 2024)
      // NOTE: Non-US ticker (.KS) - data is hardcoded (SEC API only supports US-listed companies)
      sharesOwned: 596_000_000 * 0.042, // 25.032M shares = 4.2%
      totalSharesOutstanding: 596_000_000, // Hardcoded: ~596M shares outstanding
      buyingVelocity: 4_200,
      regulatoryRule: {
        code: "K-SD",
        name: "Korea Securities Disclosure",
        description: "Crossed 5% ownership threshold",
        threshold: 5.0,
        jurisdiction: "APAC",
      },
      lastUpdated: new Date(NOW - 5 * 60 * 1000).toISOString(),
      // Hardcoded values for non-US ticker (SEC API doesn't support international exchanges)
      totalShares_Bloomberg: 595_000_000,
      totalShares_Refinitiv: 597_000_000,
    },
    {
      id: "8",
      ticker: "MSFT",
      issuer: "Microsoft Corporation",
      isin: "US5949181045",
      jurisdiction: "USA",
      // Real-world: MSFT has ~7.4 billion shares outstanding (as of 2024)
      sharesOwned: 7_400_000_000 * 0.0515, // 381.1M shares = 5.15% (active breach)
      totalSharesOutstanding: 7_400_000_000, // Will be updated from SEC API (US ticker)
      buyingVelocity: 11_200,
      regulatoryRule: regulatoryRules[1],
      lastUpdated: new Date(NOW - 55 * 60 * 1000).toISOString(),
      // Bloomberg and Refinitiv values will be fetched from SEC API
      assetStatus: 'OK', // Will be updated by checkDenominatorConfidence based on SEC data
      // Flash Recon: Data drifts
      lastReconTimestamp: new Date(NOW - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      reconStatus: 'DRIFT',
      // Delta-adjusted exposure: Include significant options positions
      derivativePositions: [
        {
          type: 'CALL',
          contracts: 75000, // 75,000 call option contracts
          delta: 0.72, // 72% delta (deep in the money)
        },
        {
          type: 'PUT',
          contracts: 20000, // 20,000 put option contracts
          delta: -0.28, // -28% delta
        },
      ],
      // Total delta-adjusted exposure:
      // sharesOwned + (75,000 * 100 * 0.72) + (20,000 * 100 * -0.28)
      // = 381.1M + 5.4M - 0.56M = 385.94M shares (delta-adjusted)
    },
    // ETF Holdings for Level 3 Look-Through Demo
    // These ETFs contain AAPL, creating "hidden exposure" that standard systems miss
    // Real-world ETF data (approximations as of 2024):
    {
      id: "etf-spy",
      ticker: "SPY",
      issuer: "SPDR S&P 500 ETF Trust",
      isin: "US78463V1070",
      jurisdiction: "USA",
      // Real-world: SPY has ~1.05 billion shares outstanding (as of 2024)
      // Position: Own 68M shares = ~6.5% of SPY
      // Indirect AAPL exposure via SPY: 6.5% × 6.5% AAPL weight = 0.42% additional exposure
      sharesOwned: 68_250_000, // ~6.5% ownership of SPY (~1.05B shares outstanding)
      totalSharesOutstanding: 1_050_000_000, // Realistic: ~1.05B shares outstanding
      buyingVelocity: 1_500,
      regulatoryRule: regulatoryRules[1], // Using same rule for demo (ETFs typically have different rules)
      lastUpdated: new Date(NOW - 1 * 60 * 1000).toISOString(),
      fundId: "INV-INDEX-ETF",
      parentId: "INVESCO-GROUP",
      price: 525.50, // Realistic SPY price (approximate)
    },
    {
      id: "etf-qqq",
      ticker: "QQQ",
      issuer: "Invesco QQQ Trust",
      isin: "US46090E1038",
      jurisdiction: "USA",
      // Real-world: QQQ has ~420 million shares outstanding (as of 2024)
      // Position: Own 25.2M shares = ~6% of QQQ
      // Indirect AAPL exposure via QQQ: 6% × 11% AAPL weight = 0.66% additional exposure
      sharesOwned: 25_200_000, // ~6% ownership of QQQ (~420M shares outstanding)
      totalSharesOutstanding: 420_000_000, // Realistic: ~420M shares outstanding
      buyingVelocity: 2_000,
      regulatoryRule: regulatoryRules[1],
      lastUpdated: new Date(NOW - 1 * 60 * 1000).toISOString(),
      fundId: "INV-TECH-ETF",
      parentId: "INVESCO-GROUP",
      price: 448.75, // Realistic QQQ price (approximate)
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

  const TARGET_COUNT = 200; // total number of synthetic holdings to generate (reduced for performance)

  for (let i = seedHoldings.length; i < TARGET_COUNT; i++) {
    const seed = seedHoldings[i % seedHoldings.length];
    const jurisdiction =
      jurisdictionsCycle[i % jurisdictionsCycle.length] ?? "USA";

    // Use base ticker from seed for realistic shares outstanding lookup
    const baseTicker = seed.ticker.split('-')[0].split('.')[0];
    const syntheticTicker = `${baseTicker}-${i + 1}`;
    
    // Get realistic shares outstanding based on jurisdiction and ticker pattern
    const totalSharesOutstanding = getRealisticSharesOutstanding(syntheticTicker);
    
    // Ownership between ~2% and ~7%, clustered around each jurisdiction's thresholds
    const basePct = 0.02 + Math.random() * 0.05;
    const sharesOwned = totalSharesOutstanding * basePct;

    // Buying velocity scales realistically with market cap (shares outstanding)
    // Large-cap (>5B shares): 5,000-25,000 shares/hour
    // Mid-cap (1B-5B shares): 2,000-10,000 shares/hour
    // Small-cap (<1B shares): 500-5,000 shares/hour
    let buyingVelocity: number;
    if (totalSharesOutstanding > 5_000_000_000) {
      buyingVelocity = 5000 + Math.floor(Math.random() * 20000);
    } else if (totalSharesOutstanding > 1_000_000_000) {
      buyingVelocity = 2000 + Math.floor(Math.random() * 8000);
    } else {
      buyingVelocity = 500 + Math.floor(Math.random() * 4500);
    }

    const lastUpdatedOffsetMinutes = Math.floor(Math.random() * 120); // up to 2 hours ago

    expandedHoldings.push({
      id: String(i + 1),
      ticker: syntheticTicker,
      issuer: `${seed.issuer} Synthetic ${i + 1}`,
      isin: `SYNTH${(i + 1).toString().padStart(8, "0")}`,
      jurisdiction,
      sharesOwned,
      totalSharesOutstanding,
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
  
  // Track last shares outstanding update time to avoid frequent API calls
  const lastSharesUpdateRef = useRef<Map<string, number>>(new Map());
  
  // Initialize holdings on client side - defer to allow initial render
  useEffect(() => {
    if (holdings.length === 0) {
      // Use requestIdleCallback to defer initialization and allow UI to render first
      const initHoldings = () => {
        const initialHoldings = createInitialHoldings();
        setHoldings(initialHoldings);
        initialHoldings.forEach((holding) => {
          baseHoldingsRef.current.set(holding.id, {
            baseShares: holding.sharesOwned,
            baseVelocity: holding.buyingVelocity,
            startTime: Date.now(),
          });
        });
        
        // Pre-fetch prices for initial holdings to avoid showing "--" on refresh
        // Fetch prices in batches to avoid overwhelming the API (async, non-blocking)
        const uniqueTickers = Array.from(new Set(initialHoldings.map(h => h.ticker)));
        const batchSize = 5;
        
        const fetchPrices = async () => {
          for (let i = 0; i < uniqueTickers.length; i += batchSize) {
            const batch = uniqueTickers.slice(i, i + batchSize);
            await Promise.all(
              batch.map(async (ticker) => {
                const holding = initialHoldings.find(h => h.ticker === ticker);
                if (!holding) return;
                
                try {
                  const response = await fetch(
                    `/api/real-time-prices?ticker=${encodeURIComponent(ticker)}&jurisdiction=${encodeURIComponent(holding.jurisdiction)}`,
                    { method: "GET", cache: "no-store" }
                  );
                  
                  if (response.ok) {
                    const data = await response.json();
                    if (data.price) {
                      // Update holdings with initial prices and source
                      setHoldings((prev) => 
                        prev.map((h) => 
                          h.ticker === ticker ? { ...h, price: data.price, priceSource: data.priceSource } : h
                        )
                      );
                    }
                  }
                } catch (error) {
                  // Silently fail - prices will be fetched by individual components
                  console.debug(`[PortfolioContext] Failed to pre-fetch price for ${ticker}`);
                }
              })
            );
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < uniqueTickers.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        };
        
        // Start fetching prices asynchronously (non-blocking)
        fetchPrices().catch(() => {
          // Prices will be fetched by individual components if pre-fetch fails
        });
      };
      
      // Defer initialization to next idle period, or use setTimeout as fallback
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(initHoldings, { timeout: 100 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(initHoldings, 0);
      }
    }
  }, [holdings.length]);

  // Real-time shares outstanding updates - fetch immediately and update frequently
  useEffect(() => {
    if (holdings.length === 0) return;

    // Fetch real shares outstanding data immediately on load
    const fetchRealSharesData = async () => {
      try {
        // Get unique tickers from holdings
        const uniqueTickers = Array.from(new Set(holdings.map(h => h.ticker)));
        
        // Fetch all tickers in parallel (with rate limiting)
        const batchSize = 5;
        const updatedShares = new Map<string, { 
          shares: number; 
          bloomberg?: number; 
          refinitiv?: number;
          isUSTicker?: boolean;
          source?: string;
        }>();
        
        for (let i = 0; i < uniqueTickers.length; i += batchSize) {
          const batch = uniqueTickers.slice(i, i + batchSize);
          const promises = batch.map(async (ticker) => {
            try {
              const response = await fetch(
                `/api/shares-outstanding?ticker=${encodeURIComponent(ticker)}`,
                {
                  method: "GET",
                  cache: "no-store",
                }
              );

              if (response.ok) {
                const data = await response.json();
                // Update if we have shares outstanding data (real or cached)
                // Always include Bloomberg/Refinitiv values if provided (even for cached/mock data)
                if (data.sharesOutstanding) {
                  updatedShares.set(ticker, {
                    shares: data.sharesOutstanding,
                    bloomberg: data.totalShares_Bloomberg,
                    refinitiv: data.totalShares_Refinitiv,
                    isUSTicker: data.isUSTicker,
                    source: data.source,
                  });
                }
              }
            } catch (error: any) {
              // Ignore network errors that occur during server restarts
              if (error?.message?.includes('Failed to fetch') || 
                  error?.message?.includes('ERR_NETWORK_CHANGED') ||
                  error?.name === 'TypeError') {
                // Silently ignore - these are expected during server restarts
                return;
              }
              console.error(`Error fetching shares outstanding for ${ticker}:`, error);
            }
            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 200));
          });

          await Promise.all(promises);
        }
        
        if (updatedShares.size > 0) {
          setHoldings((prev) => {
            return prev.map((holding) => {
              const newSharesData = updatedShares.get(holding.ticker);
              if (newSharesData && newSharesData.shares !== holding.totalSharesOutstanding) {
                // Update shares outstanding with real data
                const now = new Date().toISOString();
                return {
                  ...holding,
                  totalSharesOutstanding: newSharesData.shares,
                  // Use fetched Bloomberg/Refinitiv values if available (from SEC API), otherwise use shares value
                  totalShares_Bloomberg: newSharesData.bloomberg || newSharesData.shares,
                  totalShares_Refinitiv: newSharesData.refinitiv || newSharesData.shares,
                  sharesOutstandingSource: newSharesData.source,
                  lastUpdated: now,
                  assetStatus: 'OK' as const,
                };
              }
              return holding;
            });
          });

          console.log(`[Real-time] Updated shares outstanding for ${updatedShares.size} holdings with real data`);
        }
      } catch (error) {
        console.error("Error fetching real shares outstanding:", error);
      }
    };

    // Check for stale shares outstanding data and update
    const updateStaleSharesData = async () => {
      try {
        const updatedShares = await updateStaleSharesOutstanding(holdings);
        
        if (updatedShares.size > 0) {
          setHoldings((prev) => {
            return prev.map((holding) => {
              const newSharesData = updatedShares.get(holding.ticker);
              if (newSharesData && newSharesData.shares !== holding.totalSharesOutstanding) {
                // Update shares outstanding and mark data sources
                const now = new Date().toISOString();
                return {
                  ...holding,
                  totalSharesOutstanding: newSharesData.shares,
                  totalShares_Bloomberg: newSharesData.shares, // Use fetched value as Bloomberg source
                  totalShares_Refinitiv: holding.totalShares_Refinitiv || newSharesData.shares, // Use fetched or keep existing
                  sharesOutstandingSource: newSharesData.source,
                  lastUpdated: now,
                  assetStatus: 'OK' as const,
                };
              }
              return holding;
            });
          });

          console.log(`[Real-time] Updated shares outstanding for ${updatedShares.size} holdings`);
        }
      } catch (error) {
        console.error("Error updating shares outstanding:", error);
      }
    };

    // Initial fetch immediately (after a short delay to allow render)
    const initialTimeout = setTimeout(fetchRealSharesData, 2000);

    // Then update every 15 minutes for real-time feel (reduced from 1 hour)
    const interval = setInterval(updateStaleSharesData, 15 * 60 * 1000); // 15 minutes

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.length]); // Only re-run when holdings count changes

  // Memoize the tickers string to avoid complex expression in dependency array
  const holdingsTickersKey = useMemo(
    () => holdings.map((h) => h.ticker).join(","),
    [holdings]
  );

  // Subscribe to real-time price updates from the data provider
  // OPTIMIZED: Use refs to track subscriptions and prevent duplicate subscriptions
  const subscribedTickersRef = useRef<Set<string>>(new Set());
  const subscriptionCallbacksRef = useRef<Map<string, (assetData: AssetData) => void>>(new Map());
  
  useEffect(() => {
    if (!dataProvider || connectionStatus !== "connected" || holdings.length === 0) return;
    
    // Get unique tickers from current holdings
    const currentTickers = new Set(holdings.map(h => h.ticker));
    
    // Unsubscribe from tickers that are no longer in holdings
    subscribedTickersRef.current.forEach((ticker) => {
      if (!currentTickers.has(ticker)) {
        // Note: Adapters don't have unsubscribe, but this prevents new subscriptions
        subscribedTickersRef.current.delete(ticker);
        subscriptionCallbacksRef.current.delete(ticker);
      }
    });
    
    // Subscribe to new tickers only
    holdings.forEach((holding) => {
      if (subscribedTickersRef.current.has(holding.ticker)) return;
      
      const callback = (assetData: AssetData) => {
        // Update real-time price cache
        realTimePricesRef.current.set(holding.ticker, assetData);
        
        // Calculate volume-based buying velocity if using RealMarketAdapter
        let volumeBasedVelocity: number | undefined;
        if (dataProvider && 'calculateBuyingVelocity' in dataProvider && typeof (dataProvider as any).calculateBuyingVelocity === 'function') {
          volumeBasedVelocity = (dataProvider as any).calculateBuyingVelocity(holding.ticker);
        }
        
        // Batch price updates using requestIdleCallback for minimal CPU impact
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => {
            setHoldings((prev) => {
              const updated = prev.map((h) => {
                if (h.ticker === holding.ticker) {
                  // Check denominator confidence and set assetStatus
                  const denominatorCheck = checkDenominatorConfidence(
                    h.totalShares_Bloomberg,
                    h.totalShares_Refinitiv,
                    h.totalSharesOutstanding
                  );
                  
                  // Always update price and position data when available
                  return {
                    ...h,
                    lastUpdated: assetData.lastUpdated,
                    // Store real-time price (always update, no threshold)
                    price: assetData.price,
                    // Store price source if available
                    ...((assetData as any).priceSource && { priceSource: (assetData as any).priceSource }),
                    // Update shares based on position percentage if available
                    ...(assetData.currentPosition !== undefined && {
                      sharesOwned: (h.totalSharesOutstanding * assetData.currentPosition) / 100,
                    }),
                    // Update buying velocity based on real market volume (1.5% of daily volume)
                    ...(volumeBasedVelocity !== undefined && {
                      buyingVelocity: volumeBasedVelocity,
                    }),
                    // Set assetStatus based on denominator confidence check
                    assetStatus: denominatorCheck.assetStatus,
                  };
                }
                return h;
              });
              
              // Always return updated array to ensure all changes are reflected
              return updated;
            });
          }, { timeout: 1000 });
        } else {
          // Fallback: use requestAnimationFrame
          requestAnimationFrame(() => {
            setHoldings((prev) => {
            const updated = prev.map((h) => {
              if (h.ticker === holding.ticker) {
                // Calculate volume-based velocity if available
                let volumeBasedVelocity: number | undefined;
                if (dataProvider && 'calculateBuyingVelocity' in dataProvider && typeof (dataProvider as any).calculateBuyingVelocity === 'function') {
                  volumeBasedVelocity = (dataProvider as any).calculateBuyingVelocity(holding.ticker);
                }
                
                // Always update price and position data when available (no threshold)
                return {
                  ...h,
                  lastUpdated: assetData.lastUpdated,
                  price: assetData.price,
                  // Store price source if available
                  ...((assetData as any).priceSource && { priceSource: (assetData as any).priceSource }),
                  ...(assetData.currentPosition !== undefined && {
                    sharesOwned: (h.totalSharesOutstanding * assetData.currentPosition) / 100,
                  }),
                  // Update buying velocity based on real market volume
                  ...(volumeBasedVelocity !== undefined && {
                    buyingVelocity: volumeBasedVelocity,
                  }),
                };
              }
              return h;
            });
            
            // Always return updated array to ensure all changes are reflected
            return updated;
          });
        });
      }
    };
      
      subscribedTickersRef.current.add(holding.ticker);
      subscriptionCallbacksRef.current.set(holding.ticker, callback);
      dataProvider.subscribeToTicker(holding.ticker, callback);
    });
    
    // Cleanup: Note that adapters handle their own cleanup via dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataProvider, connectionStatus, holdingsTickersKey]); // Removed holdings from deps to prevent re-subscriptions
  
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
  // OPTIMIZED: Batching with requestAnimationFrame - ALL changes are always updated (no thresholds)
  useEffect(() => {
    if (holdings.length === 0) return;
    
    let lastUpdateTime = Date.now();
    let rafId: number | null = null;
    let pendingUpdate = false;
    
    const updateHoldings = () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime;
      
      // Update every 30 seconds - all changes are reflected (no thresholds)
      if (timeSinceLastUpdate < 30000) {
        pendingUpdate = false;
        return;
      }
      
      lastUpdateTime = now;
      pendingUpdate = false;
      
      // Use requestAnimationFrame to batch updates with browser rendering
      rafId = requestAnimationFrame(() => {
        setHoldings((prev) => {
          const updated: Holding[] = [];
          
          // Process in batches to avoid blocking
          const BATCH_SIZE = 50;
          const batches = [];
          for (let i = 0; i < prev.length; i += BATCH_SIZE) {
            batches.push(prev.slice(i, i + BATCH_SIZE));
          }
          
          for (const batch of batches) {
            for (const holding of batch) {
              const base = baseHoldingsRef.current.get(holding.id);
              if (!base) {
                updated.push(holding);
                continue;
              }

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
              
              // Always update shares (all changes are reflected, no threshold)
              
              // Update buying velocity with slight variations (±5%)
              const velocityChange = (Math.random() - 0.5) * 0.1;
              const newVelocity = Math.max(100, base.baseVelocity * (1 + velocityChange));
              
              // Update base velocity periodically (every 10 minutes of simulation)
              if (elapsedHours > 0.167) { // ~10 minutes
                base.baseVelocity = newVelocity;
                base.startTime = now;
                base.baseShares = finalShares;
              }
              
              // Update timestamp - some holdings update more frequently than others
              // to simulate real-world feed variations
              const updateInterval = holding.jurisdiction === "USA" ? 30 : 60; // Reduced frequency
              const shouldUpdate = Math.random() < (updateInterval / 120); // Probability based on interval
              
              updated.push({
                ...holding,
                sharesOwned: finalShares,
                buyingVelocity: newVelocity,
                lastUpdated: shouldUpdate 
                  ? new Date().toISOString() 
                  : holding.lastUpdated,
              });
            }
          }
          
          // Always return updated array to ensure all changes are reflected
          return updated;
        });
      });
    };
    
    // Use requestIdleCallback for non-critical updates when browser is idle
    const scheduleUpdate = () => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          if (!pendingUpdate) {
            pendingUpdate = true;
            updateHoldings();
          }
        }, { timeout: 30000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          if (!pendingUpdate) {
            pendingUpdate = true;
            updateHoldings();
          }
        }, 30000);
      }
    };
    
    scheduleUpdate();
    const interval = setInterval(scheduleUpdate, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [holdings.length]);

  // Periodic update of buying velocity based on real market volume (for RealMarketAdapter)
  useEffect(() => {
    if (!dataProvider || connectionStatus !== "connected" || holdings.length === 0) return;
    
    // Check if adapter supports volume-based velocity calculation
    if (!('calculateBuyingVelocity' in dataProvider) || typeof (dataProvider as any).calculateBuyingVelocity !== 'function') {
      return;
    }

    const updateVelocityFromVolume = () => {
      setHoldings((prev) => {
        return prev.map((holding) => {
          const volumeBasedVelocity = (dataProvider as any).calculateBuyingVelocity(holding.ticker);
          if (volumeBasedVelocity && volumeBasedVelocity > 0) {
            return {
              ...holding,
              buyingVelocity: volumeBasedVelocity,
            };
          }
          return holding;
        });
      });
    };

    // Update immediately, then every 60 seconds
    updateVelocityFromVolume();
    const interval = setInterval(updateVelocityFromVolume, 60000);

    return () => clearInterval(interval);
  }, [dataProvider, connectionStatus, holdings.length]);

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



