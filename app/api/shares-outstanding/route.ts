import { NextResponse } from "next/server";
import YahooFinance from 'yahoo-finance2';

/**
 * Server-side endpoint that fetches real-time shares outstanding data from free public APIs.
 * 
 * Uses multiple data sources with fallbacks:
 * 1. Yahoo Finance (PRIMARY - uses yahoo-finance2 library, free, no API key required)
 * 2. Finnhub (PRIMARY FALLBACK - requires API key, uses same key as price data)
 * 3. Alpha Vantage (if API key provided)
 * 4. Financial Modeling Prep (if API key provided)
 * 5. Polygon.io (if API key provided)
 * 
 * For non-US tickers (.HK, .KS, .T), Yahoo Finance and Finnhub support international exchanges.
 * 
 * Shares outstanding data typically updates quarterly when companies report earnings,
 * so we cache it for 1 hour to enable real-time updates.
 */

// Cache shares outstanding for shorter periods to enable real-time updates
// While shares outstanding typically changes quarterly, we refresh more frequently
// to catch any corporate actions (stock splits, buybacks, etc.) in real-time
const sharesCache = new Map<string, { 
  shares: number; 
  timestamp: number; 
  source: string;
  bloomberg?: number;
  refinitiv?: number;
}>();
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour (reduced from 24 hours for real-time updates)
const FORCE_REFRESH_PARAM = "force_refresh"; // Query param to bypass cache

/**
 * Check if ticker is a US-listed stock (not international exchange)
 */
function isUSTicker(ticker: string): boolean {
  // US tickers don't have exchange suffixes like .HK, .KS, .T
  return !ticker.includes('.HK') && !ticker.includes('.KS') && !ticker.includes('.T');
}

/**
 * Fetch shares outstanding from Yahoo Finance using unofficial API
 * Uses yahoo-finance2 library (Node.js equivalent of Python's yfinance)
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
    
    console.log(`[Yahoo Finance] Attempting to fetch shares outstanding for ${ticker} (Yahoo ticker: ${yahooTicker})`);
    
    // Instantiate YahooFinance and use it to get quote summary
    const yahooFinance = new YahooFinance();
    const quote = await yahooFinance.quoteSummary(yahooTicker, {
      modules: ['defaultKeyStatistics', 'summaryDetail']
    });
    
    // Extract shares outstanding from quote summary
    if (quote?.defaultKeyStatistics?.sharesOutstanding) {
      const shares = quote.defaultKeyStatistics.sharesOutstanding;
      const roundedShares = Math.round(shares);
      console.log(`[Yahoo Finance] Successfully parsed shares outstanding for ${yahooTicker}: ${roundedShares.toLocaleString()} shares`);
      return roundedShares;
    }
    
    // Alternative path: try summaryDetail
    if (quote?.summaryDetail?.sharesOutstanding) {
      const shares = quote.summaryDetail.sharesOutstanding;
      // Ensure shares is a number
      const sharesNum = typeof shares === 'number' ? shares : parseFloat(String(shares));
      if (isNaN(sharesNum)) {
        console.warn(`[Yahoo Finance] Invalid shares outstanding value for ${yahooTicker}`);
        return null;
      }
      const roundedShares = Math.round(sharesNum);
      console.log(`[Yahoo Finance] Successfully parsed shares outstanding from summaryDetail for ${yahooTicker}: ${roundedShares.toLocaleString()} shares`);
      return roundedShares;
    }

    console.warn(`[Yahoo Finance] No sharesOutstanding field found in response for ${yahooTicker}`);
    return null;
  } catch (error) {
    console.error(`[Yahoo Finance] Error fetching shares outstanding for ${ticker}:`, error);
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
 * Fetch shares outstanding from Finnhub (requires API key)
 * Uses Company Profile API endpoint which includes shareOutstanding field
 */
async function fetchFinnhubSharesOutstanding(ticker: string): Promise<number | null> {
  const apiKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!apiKey) {
    console.log(`[Finnhub] No API key found for ${ticker} - checking FINNHUB_API_KEY and NEXT_PUBLIC_FINNHUB_API_KEY`);
    return null;
  }

  try {
    // Clean ticker for Finnhub (remove exchange suffixes for US stocks, keep for international)
    const cleanTicker = ticker.split('.')[0].toUpperCase();
    console.log(`[Finnhub] Attempting to fetch shares outstanding for ${ticker} (cleaned: ${cleanTicker})`);
    
    // Finnhub Company Profile API endpoint
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${cleanTicker}&token=${apiKey}`;
    
    const response = await fetch(url, {
      cache: 'no-store', // No caching for real-time updates
    });

    if (!response.ok) {
      console.warn(`[Finnhub] API request failed for ${cleanTicker}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[Finnhub] Response for ${cleanTicker}:`, JSON.stringify(data).substring(0, 200));
    
    // Finnhub returns shareOutstanding in MILLIONS (e.g., 14776.35 means 14.776 billion shares)
    if (data?.shareOutstanding) {
      const sharesInMillions = parseFloat(data.shareOutstanding);
      if (!isNaN(sharesInMillions) && sharesInMillions > 0) {
        // Convert from millions to actual shares
        const shares = Math.round(sharesInMillions * 1_000_000);
        console.log(`[Finnhub] Successfully parsed shares outstanding for ${cleanTicker}: ${sharesInMillions}M = ${shares.toLocaleString()} shares`);
        return shares;
      } else {
        console.warn(`[Finnhub] Invalid shareOutstanding value for ${cleanTicker}: ${data.shareOutstanding}`);
      }
    } else {
      console.warn(`[Finnhub] No shareOutstanding field in response for ${cleanTicker}. Available fields:`, Object.keys(data || {}));
    }

    return null;
  } catch (error) {
    console.error(`[Finnhub] Error fetching shares outstanding for ${ticker}:`, error);
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
          totalShares_Bloomberg: cached.bloomberg || cached.shares,
          totalShares_Refinitiv: cached.refinitiv || cached.shares,
          source: "cache",
          timestamp: new Date(cached.timestamp).toISOString(),
          isRealData: true,
          isUSTicker: isUSTicker(originalTicker),
        });
      }
    }

    // Try multiple data sources in order
    let sharesOutstanding: number | null = null;
    let source = "unknown";
    let bloombergShares: number | undefined;
    let refinitivShares: number | undefined;

    // 1. Try Yahoo Finance FIRST (primary source - free, no API key required)
    sharesOutstanding = await fetchYahooFinanceSharesOutstanding(cleanTicker);
    if (sharesOutstanding) {
      source = "yahoo_finance";
      console.log(`[Shares Outstanding] ✅ Successfully fetched from Yahoo Finance (primary) for ${cleanTicker}: ${sharesOutstanding.toLocaleString()}`);
    } else {
      console.log(`[Shares Outstanding] Yahoo Finance returned null for ${cleanTicker}, falling back to Finnhub...`);
    }

    // 2. Fallback to Finnhub (uses same API key as price data)
    if (!sharesOutstanding) {
      sharesOutstanding = await fetchFinnhubSharesOutstanding(cleanTicker);
      if (sharesOutstanding) {
        source = "finnhub";
        console.log(`[Shares Outstanding] ✅ Successfully fetched from Finnhub (fallback) for ${cleanTicker}: ${sharesOutstanding.toLocaleString()}`);
      } else {
        console.log(`[Shares Outstanding] Finnhub fallback failed for ${cleanTicker}, continuing to other sources...`);
      }
    }

    // 3. Fallback to Alpha Vantage if available
    if (!sharesOutstanding) {
      sharesOutstanding = await fetchAlphaVantageSharesOutstanding(cleanTicker);
      if (sharesOutstanding) {
        source = "alpha_vantage";
      }
    }

    // 4. Fallback to Financial Modeling Prep if available
    if (!sharesOutstanding) {
      sharesOutstanding = await fetchFMPSharesOutstanding(cleanTicker);
      if (sharesOutstanding) {
        source = "financial_modeling_prep";
      }
    }

    // 5. Fallback to Polygon.io if available
    if (!sharesOutstanding) {
      sharesOutstanding = await fetchPolygonSharesOutstanding(cleanTicker);
      if (sharesOutstanding) {
        source = "polygon";
      }
    }

    // If all APIs fail, return error
    if (!sharesOutstanding) {
      return NextResponse.json(
        {
          error: "Unable to fetch shares outstanding",
          ticker: originalTicker,
          hint: "Shares outstanding APIs may be rate-limited or unavailable. Set API keys in environment variables for premium data sources.",
          availableSources: [
            "yahoo_finance (free, no API key)",
            "finnhub (requires FINNHUB_API_KEY or NEXT_PUBLIC_FINNHUB_API_KEY)",
            "alpha_vantage (requires ALPHA_VANTAGE_API_KEY)",
            "financial_modeling_prep (requires FINANCIAL_MODELING_PREP_API_KEY)",
            "polygon (requires POLYGON_API_KEY)",
          ],
          isRealData: false,
        },
        { status: 503 }
      );
    }

    // Cache the result with source information (use original ticker for cache key)
    sharesCache.set(originalTicker, { 
      shares: sharesOutstanding, 
      timestamp: Date.now(),
      source: source,
      bloomberg: bloombergShares,
      refinitiv: refinitivShares,
    });

    return NextResponse.json({
      ticker: originalTicker,
      sharesOutstanding,
      totalShares_Bloomberg: bloombergShares || sharesOutstanding,
      totalShares_Refinitiv: refinitivShares || sharesOutstanding,
      source,
      timestamp: new Date().toISOString(),
      isRealData: true, // All data sources are real APIs
      isUSTicker: isUSTicker(originalTicker), // Indicate if this is a US ticker
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

