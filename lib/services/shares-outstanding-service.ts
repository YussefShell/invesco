/**
 * Service for fetching and managing shares outstanding data in real-time.
 * 
 * This service integrates with the API endpoint to fetch shares outstanding
 * and can be used to update holdings automatically.
 */

interface SharesOutstandingResponse {
  ticker: string;
  sharesOutstanding: number;
  source: string;
  timestamp: string;
  isRealData?: boolean;
}

interface SharesOutstandingError {
  error: string;
  ticker: string;
  hint?: string;
  availableSources?: string[];
}

/**
 * Fetch shares outstanding for a single ticker
 */
export async function fetchSharesOutstanding(
  ticker: string
): Promise<number | null> {
  try {
    const response = await fetch(
      `/api/shares-outstanding?ticker=${encodeURIComponent(ticker)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorData = (await response.json()) as SharesOutstandingError;
      console.warn(
        `Failed to fetch shares outstanding for ${ticker}:`,
        errorData.error
      );
      return null;
    }

    const data = (await response.json()) as SharesOutstandingResponse;
    return data.sharesOutstanding;
  } catch (error) {
    console.error(`Error fetching shares outstanding for ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch shares outstanding for multiple tickers in batch
 * Returns a map of ticker -> { shares: number, source: string }
 */
export async function fetchMultipleSharesOutstanding(
  tickers: string[]
): Promise<Map<string, { shares: number; source?: string }>> {
  const results = new Map<string, { shares: number; source?: string }>();

  // Fetch in parallel with rate limiting (max 5 concurrent requests)
  const batchSize = 5;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
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
          const data = (await response.json()) as SharesOutstandingResponse;
          if (data.sharesOutstanding) {
            results.set(ticker, { 
              shares: data.sharesOutstanding,
              source: data.source 
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching shares outstanding for ${ticker}:`, error);
      }
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    await Promise.all(promises);
  }

  return results;
}

/**
 * Update shares outstanding for holdings if data is stale (older than 1 hour for real-time updates)
 * Returns a map of ticker -> { shares: number, source: string }
 */
export async function updateStaleSharesOutstanding(
  holdings: Array<{ ticker: string; lastUpdated?: string }>
): Promise<Map<string, { shares: number; source?: string }>> {
  const now = Date.now();
  const staleThreshold = 1 * 60 * 60 * 1000; // 1 hour (reduced from 24 hours for real-time updates)

  const staleTickers = holdings
    .filter((holding) => {
      if (!holding.lastUpdated) return true;
      const lastUpdated = new Date(holding.lastUpdated).getTime();
      return now - lastUpdated > staleThreshold;
    })
    .map((holding) => holding.ticker);

  if (staleTickers.length === 0) {
    return new Map();
  }

  console.log(`[Real-time] Updating shares outstanding for ${staleTickers.length} tickers`);
  return fetchMultipleSharesOutstanding(staleTickers);
}

/**
 * Force refresh shares outstanding for specific tickers (bypasses cache)
 */
export async function forceRefreshSharesOutstanding(
  tickers: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  // Fetch in parallel with rate limiting (max 5 concurrent requests)
  const batchSize = 5;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const promises = batch.map(async (ticker) => {
      try {
        const response = await fetch(
          `/api/shares-outstanding?ticker=${encodeURIComponent(ticker)}&force_refresh=true`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          console.warn(`Failed to force refresh shares outstanding for ${ticker}`);
          return null;
        }

        const data = (await response.json()) as { sharesOutstanding: number; isRealData: boolean };
        if (data.sharesOutstanding && data.isRealData) {
          results.set(ticker, data.sharesOutstanding);
        }
      } catch (error) {
        console.error(`Error force refreshing shares outstanding for ${ticker}:`, error);
      }
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    await Promise.all(promises);
  }

  return results;
}

