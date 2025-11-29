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

  async connect(): Promise<boolean> {
    // Health check: verify the API route exists and is reachable.
    // We check the regulatory config endpoint since it's simpler and doesn't require a valid ticker.
    try {
      const res = await fetch("/api/market-data/regulatory-config?jurisdiction=USA", {
        method: "GET",
        cache: "no-store",
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
    const poll = async () => {
      try {
        const res = await fetch(`/api/market-data?ticker=${encodeURIComponent(
          ticker
        )}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as AssetData;
        callback(body);
      } catch {
        // Swallow errors here; connection state is surfaced via connect()
      }
    };

    // Fire immediately, then every 3 seconds.
    void poll();
    const interval = setInterval(poll, 3000);
    this.pollIntervals.set(ticker, interval);
  }

  async getRegulatoryConfig(jurisdiction: string): Promise<any> {
    const res = await fetch(
      `/api/market-data/regulatory-config?jurisdiction=${encodeURIComponent(
        jurisdiction
      )}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Failed to load regulatory config for ${jurisdiction}: ${res.status} ${text}`
      );
    }

    return res.json();
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


