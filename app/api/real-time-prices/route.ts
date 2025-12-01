import { NextResponse } from "next/server";
import type { AssetData, Jurisdiction } from "@/types";

/**
 * Server-side endpoint that fetches real-time stock prices from Yahoo Finance.
 * 
 * Uses Yahoo Finance exclusively - no fallbacks to other data sources.
 * Yahoo Finance is free, requires no API key, and is reliable for predictive breach analysis.
 * 
 * This allows mock data to use real prices while remaining in "mock" mode.
 */

// Cache prices for 5 seconds to avoid rate limits
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

/**
 * Convert ticker to Yahoo Finance format
 * - UK stocks need .L suffix (London Stock Exchange)
 * - HK stocks already have .HK suffix
 * - Other international tickers keep their suffixes
 */
function convertTickerToYahooFormat(ticker: string, jurisdiction?: string): string {
  // If ticker already has an exchange suffix, keep it (e.g., 0700.HK, RIO.L)
  if (ticker.includes(".")) {
    return ticker;
  }
  
  // UK stocks need .L suffix for London Stock Exchange
  // Check by jurisdiction first, then known UK tickers
  const ukTickers = ['RIO', 'HSBA', 'BP', 'GSK', 'ULVR', 'VOD', 'BT', 'BARC', 'LLOY', 'NG', 'PRU', 'AV', 'DGE'];
  if (jurisdiction === 'UK' || ukTickers.includes(ticker)) {
    return `${ticker}.L`;
  }
  
  return ticker;
}

/**
 * Fetch real-time price from Yahoo Finance (free, no API key required)
 */
async function fetchYahooFinancePrice(ticker: string, jurisdiction?: string): Promise<number | null> {
  try {
    // Convert ticker to Yahoo Finance format
    // UK stocks need .L suffix, HK stocks have .HK, etc.
    const yahooTicker = convertTickerToYahooFormat(ticker, jurisdiction);
    
    // Log the converted ticker for debugging
    if (yahooTicker !== ticker) {
      console.debug(`[Yahoo Finance] Converted ticker ${ticker} → ${yahooTicker} for Yahoo Finance API`);
    }
    
    // Try multiple Yahoo Finance endpoints
    const endpoints = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1m&range=1d`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1m&range=1d`,
    ];
    
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          next: { revalidate: 0 }, // No caching
        });
        
        if (!res.ok) continue;
        
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (result?.meta?.regularMarketPrice) {
          const currency = result.meta?.currency || 'USD';
          console.debug(`[Yahoo Finance] Successfully fetched price for ${ticker} (${yahooTicker}): ${currency} ${result.meta.regularMarketPrice}`);
          return result.meta.regularMarketPrice;
        }
        if (result?.meta?.previousClose) {
          const currency = result.meta?.currency || 'USD';
          console.debug(`[Yahoo Finance] Using previous close price for ${ticker} (${yahooTicker}): ${currency} ${result.meta.previousClose}`);
          return result.meta.previousClose;
        }
      } catch (error) {
        console.debug(`[Yahoo Finance] Error fetching from endpoint for ${yahooTicker}:`, error);
        continue;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get jurisdiction from ticker
 */
function getJurisdictionFromTicker(ticker: string): Jurisdiction {
  if (ticker.includes(".HK")) return "Hong Kong";
  if (ticker.includes(".KS")) return "APAC";
  if (ticker.includes(".T")) return "APAC";
  if (ticker.includes(".")) return "Other";
  
  // Default to USA for most US tickers
  return "USA";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");
    const jurisdiction = searchParams.get("jurisdiction") as Jurisdiction | null;

    if (!ticker) {
      return NextResponse.json(
        { error: "Missing required query parameter: ticker" },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = priceCache.get(ticker);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ticker,
        price: cached.price,
        currentPosition: undefined,
        jurisdiction: jurisdiction ?? getJurisdictionFromTicker(ticker),
        lastUpdated: new Date().toISOString(),
      } as AssetData);
    }

    // Fetch price from Yahoo Finance exclusively - no fallbacks
    const effectiveJurisdiction = jurisdiction ?? getJurisdictionFromTicker(ticker);
    const price = await fetchYahooFinancePrice(ticker, effectiveJurisdiction);
    
    if (!price) {
      return NextResponse.json(
        {
          error: "Unable to fetch real-time price from Yahoo Finance",
          ticker,
          hint: "Yahoo Finance API may be temporarily unavailable or the ticker may be invalid. Please try again later.",
        },
        { status: 503 }
      );
    }
    
    const priceSource = 'yahoo_finance';
    console.debug(`[real-time-prices] Successfully fetched price from Yahoo Finance for ${ticker}`);

    // Cache the price
    priceCache.set(ticker, { price, timestamp: Date.now() });

    const assetData: AssetData & { priceSource?: string } = {
      ticker,
      price: Number(price.toFixed(2)),
      currentPosition: undefined,
      jurisdiction: jurisdiction ?? getJurisdictionFromTicker(ticker),
      lastUpdated: new Date().toISOString(),
      priceSource,
    };

    return NextResponse.json(assetData);
  } catch (error: any) {
    console.error("[real-time-prices] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch real-time price from Yahoo Finance",
        details: error?.message ?? String(error),
        hint: "Yahoo Finance API may be temporarily unavailable. Please try again later.",
      },
      { status: 500 }
    );
  }
}

