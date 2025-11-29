import type { AssetData } from "@/types";
import type { IPortfolioDataProvider } from "@/lib/types/IDataProvider";

/**
 * Browser-side production adapter that talks to server-side API routes:
 *   - GET /api/market-data?ticker=NVDA&jurisdiction=USA
 *   - GET /api/market-data/regulatory-config?jurisdiction=USA
 *
 * Those API routes in turn proxy to your internal REST/gRPC gateway in front of
 * Kafka/CRD or a FIX bridge, keeping all sensitive details server-side.
 */
export class RestProductionAdapter implements IPortfolioDataProvider {
  private pollIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private retryAttempts = new Map<string, number>();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second base delay

  /**
   * Retry fetch with exponential backoff
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = this.MAX_RETRIES
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        cache: "no-store",
      });
      
      // Reset retry count on success
      this.retryAttempts.delete(url);
      
      return response;
    } catch (error) {
      if (retries > 0) {
        const attempt = this.MAX_RETRIES - retries + 1;
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        
        console.warn(`[RestProductionAdapter] Request failed, retrying in ${delay}ms (${attempt}/${this.MAX_RETRIES})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      
      // All retries exhausted
      this.retryAttempts.delete(url);
      throw error;
    }
  }

  async connect(): Promise<boolean> {
    // Health check: verify the API route exists and is reachable.
    // We check the regulatory config endpoint since it's simpler and doesn't require a valid ticker.
    try {
      const res = await this.fetchWithRetry("/api/market-data/regulatory-config?jurisdiction=USA", {
        method: "GET",
      });
      
      // 400/404 means route exists but params are wrong (acceptable for health check)
      // 500/502 means route doesn't exist or upstream gateway is down
      if (res.status >= 500 || res.status === 502) {
        let errorMessage = `Gateway health check failed: ${res.status}`;
        try {
          const errorBody = await res.json().catch(() => null);
          if (errorBody?.error) {
            errorMessage = errorBody.error;
            if (errorBody.hint) {
              errorMessage += ` ${errorBody.hint}`;
            }
          } else {
            const text = await res.text().catch(() => "");
            if (text) errorMessage += ` ${text}`;
          }
        } catch {
          const text = await res.text().catch(() => "");
          if (text) errorMessage += ` ${text}`;
        }
        throw new Error(errorMessage);
      }
      
      // If we get here, the route exists (even if env vars aren't set, we'll get a 500 with a message)
      // which means the Next.js API route is working
      return true;
    } catch (error: any) {
      // Network errors or upstream failures
      const message = error?.message ?? String(error);
      if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
        throw new Error(
          "PRODUCTION GATEWAY UNAVAILABLE: Cannot reach server-side API routes. Ensure the Next.js server is running."
        );
      }
      throw new Error(
        `PRODUCTION GATEWAY UNAVAILABLE: ${message}`
      );
    }
  }

  subscribeToTicker(
    ticker: string,
    callback: (data: AssetData) => void
  ): void {
    // Simple polling implementation to keep semantics consistent
    // even if your upstream is not streaming yet.
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;
    
    const poll = async () => {
      try {
        const url = `/api/market-data?ticker=${encodeURIComponent(ticker)}`;
        const res = await this.fetchWithRetry(url, {
          method: "GET",
        });
        
        if (!res.ok) {
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.error(`[RestProductionAdapter] Too many consecutive errors for ${ticker}, stopping polling`);
            const interval = this.pollIntervals.get(ticker);
            if (interval) {
              clearInterval(interval);
              this.pollIntervals.delete(ticker);
            }
            return;
          }
          return;
        }
        
        // Reset error count on success
        consecutiveErrors = 0;
        const body = (await res.json()) as AssetData;
        callback(body);
      } catch (error) {
        consecutiveErrors++;
        console.warn(`[RestProductionAdapter] Error polling ${ticker}:`, error);
        
        // Stop polling after too many errors
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error(`[RestProductionAdapter] Too many consecutive errors for ${ticker}, stopping polling`);
          const interval = this.pollIntervals.get(ticker);
          if (interval) {
            clearInterval(interval);
            this.pollIntervals.delete(ticker);
          }
        }
        // Swallow errors here; connection state is surfaced via connect()
      }
    };

    // Fire immediately, then every 3 seconds.
    void poll();
    const interval = setInterval(poll, 3000);
    this.pollIntervals.set(ticker, interval);
  }

  async getRegulatoryConfig(jurisdiction: string): Promise<any> {
    try {
      const url = `/api/market-data/regulatory-config?jurisdiction=${encodeURIComponent(jurisdiction)}`;
      const res = await this.fetchWithRetry(url, {
        method: "GET",
      });

      if (!res.ok) {
        let errorMessage = `Failed to load regulatory config for ${jurisdiction}: ${res.status}`;
        try {
          const errorBody = await res.json().catch(() => null);
          if (errorBody?.error) {
            errorMessage = errorBody.error;
            if (errorBody.hint) {
              errorMessage += ` ${errorBody.hint}`;
            }
          } else {
            const text = await res.text().catch(() => "");
            if (text) errorMessage += ` ${text}`;
          }
        } catch {
          const text = await res.text().catch(() => "");
          if (text) errorMessage += ` ${text}`;
        }
        throw new Error(errorMessage);
      }

      return res.json();
    } catch (error: any) {
      const message = error?.message ?? String(error);
      throw new Error(`Failed to load regulatory config for ${jurisdiction}: ${message}`);
    }
  }

  /**
   * Optional clean-up for polling timers; you can wire this to RiskContext
   * similarly to MockAdapter.dispose() if needed.
   */
  dispose() {
    for (const interval of this.pollIntervals.values()) {
      clearInterval(interval);
    }
    this.pollIntervals.clear();
  }
}


