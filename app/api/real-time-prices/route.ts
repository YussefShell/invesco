import { NextResponse } from "next/server";
import type { AssetData, Jurisdiction } from "@/types";

/**
 * Server-side endpoint that fetches real-time stock prices from free public APIs.
 * 
 * Uses multiple data sources with fallbacks:
 * 1. Yahoo Finance (via yahoo-finance-api or direct scraping)
 * 2. Alpha Vantage (if API key provided)
 * 3. Finnhub (if API key provided)
 * 
 * This allows mock data to use real prices while remaining in "mock" mode.
 */

// Cache prices for 5 seconds to avoid rate limits
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

/**
 * Fetch real-time price from Yahoo Finance (free, no API key required)
 */
async function fetchYahooFinancePrice(ticker: string): Promise<number | null> {
  try {
    // Yahoo Finance API endpoint (free, no auth required)
    // Format: US tickers as-is, international tickers need exchange suffix
    let yahooTicker = ticker;
    
    // Handle international tickers
    if (ticker.includes(".HK")) {
      yahooTicker = ticker.replace(".HK", ".HK");
    } else if (ticker.includes(".KS")) {
      yahooTicker = ticker.replace(".KS", ".KS");
    } else if (ticker.includes(".T")) {
      yahooTicker = ticker.replace(".T", ".T");
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
          return result.meta.regularMarketPrice;
        }
        if (result?.meta?.previousClose) {
          return result.meta.previousClose;
        }
      } catch {
        continue;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch real-time price from Alpha Vantage (requires API key)
 */
async function fetchAlphaVantagePrice(ticker: string): Promise<number | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;
  
  try {
    // Clean ticker for Alpha Vantage (remove exchange suffixes)
    const cleanTicker = ticker.split('.')[0];
    
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${cleanTicker}&apikey=${apiKey}`;
    const res = await fetch(url, {
      next: { revalidate: 0 },
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    const quote = data?.["Global Quote"];
    if (quote?.["05. price"]) {
      return parseFloat(quote["05. price"]);
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch real-time price from Finnhub (requires API key)
 */
async function fetchFinnhubPrice(ticker: string): Promise<number | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  
  try {
    // Clean ticker for Finnhub
    const cleanTicker = ticker.split('.')[0];
    
    const url = `https://finnhub.io/api/v1/quote?symbol=${cleanTicker}&token=${apiKey}`;
    const res = await fetch(url, {
      next: { revalidate: 0 },
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data?.c) { // 'c' is current price
      return data.c;
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

  // Try multiple data sources in order
  let price: number | null = null;
  
  // 1. Try Yahoo Finance first (free, no API key)
  price = await fetchYahooFinancePrice(ticker);
  
  // 2. Fallback to Alpha Vantage if available
  if (!price) {
    price = await fetchAlphaVantagePrice(ticker);
  }
  
  // 3. Fallback to Finnhub if available
  if (!price) {
    price = await fetchFinnhubPrice(ticker);
  }

  if (!price) {
    return NextResponse.json(
      {
        error: "Unable to fetch real-time price",
        ticker,
        hint: "Real-time price APIs may be rate-limited or unavailable. The mock adapter will use generated prices as fallback.",
      },
      { status: 503 }
    );
  }

  // Cache the price
  priceCache.set(ticker, { price, timestamp: Date.now() });

  const assetData: AssetData = {
    ticker,
    price: Number(price.toFixed(2)),
    currentPosition: undefined,
    jurisdiction: jurisdiction ?? getJurisdictionFromTicker(ticker),
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(assetData);
}

