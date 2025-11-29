import { NextResponse } from "next/server";

/**
 * Server-side endpoint that fetches real-time shares outstanding data from free public APIs.
 * 
 * Uses multiple data sources with fallbacks:
 * 1. Yahoo Finance (via direct API calls)
 * 2. Alpha Vantage (if API key provided)
 * 3. Financial Modeling Prep (if API key provided)
 * 
 * Shares outstanding data typically updates quarterly when companies report earnings,
 * so we cache it for 24 hours to avoid unnecessary API calls.
 */

// Cache shares outstanding for shorter periods to enable real-time updates
// While shares outstanding typically changes quarterly, we refresh more frequently
// to catch any corporate actions (stock splits, buybacks, etc.) in real-time
const sharesCache = new Map<string, { shares: number; timestamp: number; source: string }>();
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour (reduced from 24 hours for real-time updates)
const FORCE_REFRESH_PARAM = "force_refresh"; // Query param to bypass cache

/**
 * Realistic shares outstanding data (as of 2024) - based on actual SEC filings and financial reports
 * Used as fallback when external APIs are unavailable
 */
const REALISTIC_SHARES_OUTSTANDING: Record<string, number> = {
  "NVDA": 2_460_000_000,      // NVIDIA Corp: ~2.46B shares (as of Q3 2024)
  "0700.HK": 9_520_000_000,    // Tencent Holdings: ~9.52B shares (HKD listing)
  "RIO": 1_630_000_000,        // Rio Tinto Group: ~1.63B shares (as of 2024)
  "AAPL": 15_500_000_000,      // Apple Inc: ~15.5B shares (as of Q4 2024)
  "HSBA": 19_200_000_000,      // HSBC Holdings: ~19.2B shares (as of 2024)
  "BABA": 2_100_000_000,       // Alibaba Group: ~2.1B shares (NYSE listing)
  "005930.KS": 596_000_000,   // Samsung Electronics: ~596M shares (as of 2024)
  "MSFT": 7_400_000_000,       // Microsoft Corp: ~7.4B shares (as of Q4 2024)
  "TSLA": 3_180_000_000,       // Tesla Inc: ~3.18B shares (as of 2024)
  "GOOGL": 12_600_000_000,     // Alphabet Class A: ~12.6B shares (as of 2024)
  "GOOG": 12_600_000_000,      // Alphabet Class C: ~12.6B shares (as of 2024)
  "AMZN": 10_400_000_000,      // Amazon.com: ~10.4B shares (as of 2024)
  "META": 2_540_000_000,       // Meta Platforms: ~2.54B shares (as of 2024)
  "JPM": 2_920_000_000,        // JPMorgan Chase: ~2.92B shares (as of 2024)
  "BAC": 7_980_000_000,        // Bank of America: ~7.98B shares (as of 2024)
  "GS": 330_000_000,           // Goldman Sachs: ~330M shares (as of 2024)
  "MS": 1_720_000_000,         // Morgan Stanley: ~1.72B shares (as of 2024)
  "JNJ": 2_640_000_000,        // Johnson & Johnson: ~2.64B shares (as of 2024)
  "PFE": 5_640_000_000,        // Pfizer Inc: ~5.64B shares (as of 2024)
  "UNH": 950_000_000,          // UnitedHealth Group: ~950M shares (as of 2024)
  "WMT": 8_080_000_000,        // Walmart Inc: ~8.08B shares (as of 2024)
  "PG": 2_380_000_000,         // Procter & Gamble: ~2.38B shares (as of 2024)
  "KO": 4_320_000_000,         // Coca-Cola Company: ~4.32B shares (as of 2024)
  "XOM": 4_100_000_000,        // Exxon Mobil: ~4.1B shares (as of 2024)
  "CVX": 1_900_000_000,        // Chevron Corp: ~1.9B shares (as of 2024)
  "0941.HK": 20_400_000_000,   // China Mobile: ~20.4B shares (HKD listing)
  "1299.HK": 11_500_000_000,   // AIA Group: ~11.5B shares (HKD listing)
  "9988.HK": 21_000_000_000,   // Alibaba HK: ~21B shares (HKD listing)
  "BP": 17_200_000_000,        // BP plc: ~17.2B shares (as of 2024)
  "GSK": 4_050_000_000,        // GSK plc: ~4.05B shares (as of 2024)
  "ULVR": 2_580_000_000,       // Unilever plc: ~2.58B shares (as of 2024)
  "000660.KS": 68_000_000,     // SK Hynix: ~68M shares (as of 2024)
  "7203.T": 13_500_000_000,   // Toyota Motor: ~13.5B shares (JPY listing)
  "6758.T": 1_240_000_000,     // Sony Group: ~1.24B shares (JPY listing)
  "NFLX": 430_000_000,         // Netflix Inc: ~430M shares (as of 2024)
  "DIS": 1_830_000_000,        // Walt Disney: ~1.83B shares (as of 2024)
  "V": 2_070_000_000,          // Visa Inc: ~2.07B shares (as of 2024)
  "MA": 960_000_000,           // Mastercard Inc: ~960M shares (as of 2024)
  "AMD": 1_620_000_000,        // Advanced Micro Devices: ~1.62B shares (as of 2024)
  "INTC": 4_240_000_000,       // Intel Corp: ~4.24B shares (as of 2024)
  "ORCL": 2_780_000_000,       // Oracle Corp: ~2.78B shares (as of 2024)
  "SPY": 1_050_000_000,        // SPDR S&P 500 ETF: ~1.05B shares (as of 2024)
  "QQQ": 420_000_000,          // Invesco QQQ Trust: ~420M shares (as of 2024)
};

/**
 * Get realistic mock shares outstanding for a ticker
 * Returns actual shares outstanding if available, otherwise a realistic estimate based on jurisdiction
 */
function getMockSharesOutstanding(ticker: string): number | null {
  // Try exact match first
  if (REALISTIC_SHARES_OUTSTANDING[ticker]) {
    return REALISTIC_SHARES_OUTSTANDING[ticker];
  }
  
  // Remove numeric suffixes (e.g., "NVDA-12" -> "NVDA", "AAPL-16" -> "AAPL")
  let tickerWithoutSuffix = ticker.replace(/-\d+$/, '');
  
  // Handle Korean tickers (005930 -> 005930.KS)
  if (tickerWithoutSuffix.startsWith('005930')) {
    tickerWithoutSuffix = '005930.KS';
  }
  // Handle Hong Kong tickers (0700 -> 0700.HK)
  else if (tickerWithoutSuffix === '0700' || tickerWithoutSuffix.startsWith('0700')) {
    tickerWithoutSuffix = '0700.HK';
  }
  
  if (REALISTIC_SHARES_OUTSTANDING[tickerWithoutSuffix]) {
    return REALISTIC_SHARES_OUTSTANDING[tickerWithoutSuffix];
  }
  
  // Try base ticker (remove suffixes like .HK, .KS, .T)
  const baseTicker = ticker.split('.')[0].replace(/-\d+$/, '');
  if (REALISTIC_SHARES_OUTSTANDING[baseTicker]) {
    return REALISTIC_SHARES_OUTSTANDING[baseTicker];
  }
  
  // For unknown tickers, return null to indicate we don't have data
  // This is better than returning a random estimate
  return null;
}

/**
 * Fetch shares outstanding from Yahoo Finance (free, no API key required)
 */
async function fetchYahooFinanceSharesOutstanding(ticker: string): Promise<number | null> {
  try {
    // Clean ticker for Yahoo Finance
    let yahooTicker = ticker;
    
    // Handle international tickers
    if (ticker.includes(".HK")) {
      yahooTicker = ticker.replace(".HK", ".HK");
    } else if (ticker.includes(".KS")) {
      yahooTicker = ticker.replace(".KS", ".KS");
    } else if (ticker.includes(".T")) {
      yahooTicker = ticker.replace(".T", ".T");
    }
    
    // Yahoo Finance quote endpoint that includes shares outstanding
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooTicker}?modules=defaultKeyStatistics,summaryDetail`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store', // No caching for real-time updates
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Extract shares outstanding from Yahoo Finance response
    if (data?.quoteSummary?.result?.[0]?.defaultKeyStatistics?.sharesOutstanding?.raw) {
      const shares = data.quoteSummary.result[0].defaultKeyStatistics.sharesOutstanding.raw;
      return Math.round(shares);
    }
    
    // Alternative path: try summaryDetail
    if (data?.quoteSummary?.result?.[0]?.summaryDetail?.sharesOutstanding?.raw) {
      const shares = data.quoteSummary.result[0].summaryDetail.sharesOutstanding.raw;
      return Math.round(shares);
    }

    return null;
  } catch (error) {
    console.error(`Error fetching shares outstanding from Yahoo Finance for ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch shares outstanding from Alpha Vantage (requires API key)
 */
async function fetchAlphaVantageSharesOutstanding(ticker: string): Promise<number | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`;
    const response = await fetch(url, {
      cache: 'no-store', // No caching for real-time updates
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data?.SharesOutstanding) {
      const shares = parseFloat(data.SharesOutstanding);
      if (!isNaN(shares)) {
        return Math.round(shares);
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching shares outstanding from Alpha Vantage for ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch shares outstanding from Financial Modeling Prep (requires API key)
 */
async function fetchFMPSharesOutstanding(ticker: string): Promise<number | null> {
  const apiKey = process.env.FINANCIAL_MODELING_PREP_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const url = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`;
    const response = await fetch(url, {
      cache: 'no-store', // No caching for real-time updates
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data[0]?.sharesOutstanding) {
      const shares = parseFloat(data[0].sharesOutstanding);
      if (!isNaN(shares)) {
        return Math.round(shares);
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching shares outstanding from FMP for ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch shares outstanding from Polygon.io (requires API key)
 */
async function fetchPolygonSharesOutstanding(ticker: string): Promise<number | null> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const url = `https://api.polygon.io/v2/reference/financials?ticker=${ticker}&timeframe=quarterly&limit=1&apikey=${apiKey}`;
    const response = await fetch(url, {
      cache: 'no-store', // No caching for real-time updates
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data?.results?.[0]?.shares_outstanding) {
      const shares = parseFloat(data.results[0].shares_outstanding);
      if (!isNaN(shares)) {
        return Math.round(shares);
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching shares outstanding from Polygon for ${ticker}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let ticker = searchParams.get("ticker");
    const forceRefresh = searchParams.get(FORCE_REFRESH_PARAM) === "true";

    if (!ticker) {
      return NextResponse.json(
        { error: "Missing required query parameter: ticker" },
        { status: 400 }
      );
    }

    // Clean ticker: remove numeric suffixes (e.g., "NVDA-12" -> "NVDA") for API calls
    // But keep original for caching
    const originalTicker = ticker;
    let cleanTicker = ticker.replace(/-\d+$/, '');
    
    // Handle Korean tickers (005930 -> 005930.KS)
    if (cleanTicker.startsWith('005930')) {
      cleanTicker = '005930.KS';
    }
    // Handle Hong Kong tickers (0700 -> 0700.HK)
    else if (cleanTicker === '0700' || cleanTicker.startsWith('0700')) {
      cleanTicker = '0700.HK';
    }

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cached = sharesCache.get(originalTicker);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json({
          ticker: originalTicker,
          sharesOutstanding: cached.shares,
          source: cached.source === "mock_fallback" ? "cache_mock" : "cache",
          timestamp: new Date(cached.timestamp).toISOString(),
          isRealData: cached.source !== "mock_fallback",
        });
      }
    }

    // Try multiple data sources in order
    let sharesOutstanding: number | null = null;
    let source = "unknown";

    // 1. Try Yahoo Finance first (free, no API key) - use clean ticker for API calls
    sharesOutstanding = await fetchYahooFinanceSharesOutstanding(cleanTicker);
  if (sharesOutstanding) {
    source = "yahoo_finance";
  }

    // 2. Fallback to Alpha Vantage if available
    if (!sharesOutstanding) {
      sharesOutstanding = await fetchAlphaVantageSharesOutstanding(cleanTicker);
      if (sharesOutstanding) {
        source = "alpha_vantage";
      }
    }

    // 3. Fallback to Financial Modeling Prep if available
    if (!sharesOutstanding) {
      sharesOutstanding = await fetchFMPSharesOutstanding(cleanTicker);
      if (sharesOutstanding) {
        source = "financial_modeling_prep";
      }
    }

    // 4. Fallback to Polygon.io if available
    if (!sharesOutstanding) {
      sharesOutstanding = await fetchPolygonSharesOutstanding(cleanTicker);
      if (sharesOutstanding) {
        source = "polygon";
      }
    }

    // If all APIs fail, try mock data as last resort, but mark it clearly
    if (!sharesOutstanding) {
      const mockSharesOutstanding = getMockSharesOutstanding(originalTicker);
    if (mockSharesOutstanding) {
      sharesOutstanding = mockSharesOutstanding;
      source = "mock_fallback";
      // Log warning that we're using mock data
      console.warn(`[Shares Outstanding] Using mock fallback data for ${originalTicker}. Real-time data unavailable.`);
    } else {
      return NextResponse.json(
        {
          error: "Unable to fetch shares outstanding",
          ticker: originalTicker,
          hint: "Shares outstanding APIs may be rate-limited or unavailable. Set API keys in environment variables for premium data sources.",
          availableSources: [
            "yahoo_finance (free, no API key)",
            "alpha_vantage (requires ALPHA_VANTAGE_API_KEY)",
            "financial_modeling_prep (requires FINANCIAL_MODELING_PREP_API_KEY)",
            "polygon (requires POLYGON_API_KEY)",
          ],
          isRealData: false,
        },
        { status: 503 }
      );
    }
    }

    // Cache the result with source information (use original ticker for cache key)
    sharesCache.set(originalTicker, { 
      shares: sharesOutstanding, 
      timestamp: Date.now(),
      source: source 
    });

    return NextResponse.json({
      ticker: originalTicker,
      sharesOutstanding,
      source,
      timestamp: new Date().toISOString(),
      isRealData: source !== "mock_fallback", // Indicate if this is real data or mock
    });
  } catch (error) {
    console.error(`[Shares Outstanding API] Error processing request:`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

