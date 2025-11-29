import type { AssetData } from "@/types";
import type { IPortfolioDataProvider } from "@/lib/types/IDataProvider";

/**
 * Browser-side production adapter that connects to a WebSocket gateway in front
 * of Kafka/CRD or a FIX bridge.
 *
 * Expected upstream (you fill in WS_BASE_URL & auth):
 *   - WS endpoint: wss://your-gateway.example.com/market-stream
 *   - On open: client sends { type: "subscribe", ticker: "NVDA" }
 *   - Server pushes: { type: "quote", ticker, price, position, jurisdiction, asOf }
 */
export class WebSocketProductionAdapter implements IPortfolioDataProvider {
  private socket: WebSocket | null = null;
  private isConnecting = false;
  private subscriptions = new Map<string, Array<(data: AssetData) => void>>();

  constructor(
    private options: {
      wsBaseUrl: string;
      authToken?: string;
    }
  ) {}

  async connect(): Promise<boolean> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return true;
    }
    if (this.isConnecting) {
      // Wait for an in-flight connection attempt
      await new Promise((resolve) => setTimeout(resolve, 500));
      return this.socket?.readyState === WebSocket.OPEN;
    }

    this.isConnecting = true;

    const url = new URL(this.options.wsBaseUrl);
    if (this.options.authToken) {
      url.searchParams.set("token", this.options.authToken);
    }

    this.socket = new WebSocket(url.toString());

    return await new Promise<boolean>((resolve, reject) => {
      if (!this.socket) {
        this.isConnecting = false;
        reject(new Error("Failed to create WebSocket instance"));
        return;
      }

      this.socket.onopen = () => {
        this.isConnecting = false;
        resolve(true);
      };

      this.socket.onerror = (event) => {
        this.isConnecting = false;
        reject(
          new Error(
            `WEBSOCKET CONNECTION FAILED: ${JSON.stringify(event, null, 2)}`
          )
        );
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            ticker?: string;
            price?: number;
            position?: number;
            jurisdiction?: string;
            asOf?: string;
          };

          if (msg.type !== "quote" || !msg.ticker || msg.price == null) return;

          const listeners = this.subscriptions.get(msg.ticker);
          if (!listeners || listeners.length === 0) return;

          const payload: AssetData = {
            ticker: msg.ticker,
            price: msg.price,
            currentPosition: msg.position,
            jurisdiction: (msg.jurisdiction ??
              "Other") as AssetData["jurisdiction"],
            lastUpdated: msg.asOf ?? new Date().toISOString(),
          };

          listeners.forEach((cb) => cb(payload));
        } catch {
          // Ignore malformed messages
        }
      };
    });
  }

  subscribeToTicker(
    ticker: string,
    callback: (data: AssetData) => void
  ): void {
    const existing = this.subscriptions.get(ticker) ?? [];
    existing.push(callback);
    this.subscriptions.set(ticker, existing);

    // Send subscription message if socket is open
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "subscribe",
          ticker,
        })
      );
    }
  }

  async getRegulatoryConfig(jurisdiction: string): Promise<any> {
    // Even in a WebSocket world, config is typically fetched over REST.
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

  dispose() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.subscriptions.clear();
  }
}


