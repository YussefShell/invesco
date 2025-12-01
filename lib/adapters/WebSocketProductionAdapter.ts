import type { AssetData } from "@/types";
import type { IPortfolioDataProvider } from "@/lib/types/IDataProvider";
import { getDataAdapterConfig } from "@/lib/config/data-adapters";
import { Logger } from "@/lib/utils/logger";

const logger = new Logger("WebSocketAdapter");

interface WebSocketOptions {
  wsBaseUrl: string;
  authToken?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

/**
 * Browser-side production adapter that connects to a WebSocket gateway in front
 * of Kafka/CRD or a FIX bridge.
 *
 * Enhanced with:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/ping-pong mechanism
 * - Connection timeout handling
 * - Proper cleanup on dispose
 *
 * Expected upstream (you fill in WS_BASE_URL & auth):
 *   - WS endpoint: wss://your-gateway.example.com/market-stream
 *   - On open: client sends { type: "subscribe", ticker: "NVDA" }
 *   - Server pushes: { type: "quote", ticker, price, position, jurisdiction, asOf }
 *   - Heartbeat: client sends { type: "ping" }, server responds { type: "pong" }
 */
export class WebSocketProductionAdapter implements IPortfolioDataProvider {
  private socket: WebSocket | null = null;
  private isConnecting = false;
  private subscriptions = new Map<string, Array<(data: AssetData) => void>>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private connectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelay: number;
  private readonly heartbeatInterval: number;
  private readonly connectionTimeout: number;
  private config: ReturnType<typeof getDataAdapterConfig>;

  constructor(private options: WebSocketOptions) {
    this.config = getDataAdapterConfig();
    this.maxReconnectAttempts =
      options.reconnectAttempts ?? this.config.websocket.reconnectAttempts;
    this.reconnectDelay =
      options.reconnectDelay ?? this.config.websocket.reconnectDelay;
    this.heartbeatInterval =
      options.heartbeatInterval ?? this.config.websocket.heartbeatInterval;
    this.connectionTimeout =
      options.connectionTimeout ?? this.config.websocket.connectionTimeout;
  }

  async connect(): Promise<boolean> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return true;
    }

    if (this.isConnecting) {
      // Wait for in-flight connection
      await new Promise((resolve) => setTimeout(resolve, 500));
      return this.socket?.readyState === WebSocket.OPEN;
    }

    return this.attemptConnection();
  }

  private async attemptConnection(): Promise<boolean> {
    this.isConnecting = true;
    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.isConnecting = false;
      const error = new Error(
        `Max reconnection attempts (${this.maxReconnectAttempts}) exceeded`
      );
      logger.error("Max reconnection attempts exceeded", {
        maxAttempts: this.maxReconnectAttempts,
      });
      throw error;
    }

    const url = new URL(this.options.wsBaseUrl);
    if (this.options.authToken) {
      url.searchParams.set("token", this.options.authToken);
    }

    logger.debug("Attempting WebSocket connection", {
      attempt: this.reconnectAttempts,
      url: url.toString().replace(this.options.authToken || "", "***"),
    });

    this.socket = new WebSocket(url.toString());

    return new Promise<boolean>((resolve, reject) => {
      if (!this.socket) {
        this.isConnecting = false;
        reject(new Error("Failed to create WebSocket instance"));
        return;
      }

      // Connection timeout
      this.connectionTimeoutTimer = setTimeout(() => {
        if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
          this.socket.close();
          this.isConnecting = false;
          const error = new Error(
            `WebSocket connection timeout after ${this.connectionTimeout}ms`
          );
          logger.warn("WebSocket connection timeout", {
            timeout: this.connectionTimeout,
          });
          reject(error);
        }
      }, this.connectionTimeout);

      this.socket.onopen = () => {
        if (this.connectionTimeoutTimer) {
          clearTimeout(this.connectionTimeoutTimer);
          this.connectionTimeoutTimer = null;
        }
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        logger.info("WebSocket connected successfully");

        // Start heartbeat
        this.startHeartbeat();

        // Resubscribe to all tickers
        this.subscriptions.forEach((_, ticker) => {
          this.sendSubscription(ticker);
        });

        resolve(true);
      };

      this.socket.onerror = (event) => {
        if (this.connectionTimeoutTimer) {
          clearTimeout(this.connectionTimeoutTimer);
          this.connectionTimeoutTimer = null;
        }
        this.isConnecting = false;
        logger.error("WebSocket connection error", { event });
      };

      this.socket.onclose = (event) => {
        if (this.connectionTimeoutTimer) {
          clearTimeout(this.connectionTimeoutTimer);
          this.connectionTimeoutTimer = null;
        }
        this.isConnecting = false;
        this.stopHeartbeat();

        logger.warn("WebSocket connection closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });

        // Attempt reconnection if not a clean close and we haven't exceeded max attempts
        if (
          event.code !== 1000 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.scheduleReconnect();
        }
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

          // Handle heartbeat response
          if (msg.type === "pong") {
            logger.debug("Received pong heartbeat");
            return;
          }

          if (msg.type !== "quote" || !msg.ticker || msg.price == null) {
            return;
          }

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
        } catch (error) {
          logger.error("Error parsing WebSocket message", { error });
        }
      };
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    logger.info("Scheduling WebSocket reconnection", {
      attempt: this.reconnectAttempts + 1,
      delay,
      maxAttempts: this.maxReconnectAttempts,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.attemptConnection().catch((error) => {
        logger.error("Reconnection failed", { error: error.message });
      });
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: "ping" }));
          logger.debug("Sent ping heartbeat");
        } catch (error) {
          logger.warn("Failed to send heartbeat", { error });
          this.stopHeartbeat();
        }
      } else {
        this.stopHeartbeat();
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendSubscription(ticker: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(
          JSON.stringify({
            type: "subscribe",
            ticker,
          })
        );
        logger.debug("Sent subscription", { ticker });
      } catch (error) {
        logger.warn("Failed to send subscription", { ticker, error });
      }
    }
  }

  subscribeToTicker(
    ticker: string,
    callback: (data: AssetData) => void
  ): void {
    const existing = this.subscriptions.get(ticker) ?? [];
    existing.push(callback);
    this.subscriptions.set(ticker, existing);

    // Send subscription if connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendSubscription(ticker);
    } else if (!this.isConnecting) {
      // Trigger connection if not already connecting
      this.connect().catch((error) => {
        logger.error("Failed to connect for subscription", {
          ticker,
          error: error.message,
        });
      });
    }
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

  dispose() {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }

    if (this.socket) {
      this.socket.close(1000, "Disposed by adapter");
      this.socket = null;
    }

    this.subscriptions.clear();
    logger.info("WebSocket adapter disposed");
  }
}
