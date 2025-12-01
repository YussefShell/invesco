import type { AssetData } from "@/types";
import type { IPortfolioDataProvider } from "@/lib/types/IDataProvider";

/**
 * Real Market Data Adapter using Finnhub WebSocket API
 * 
 * Hybrid Data Model:
 * - Private Data (Simulated): Shares Owned, Buying Strategy
 * - Public Data (REAL): Live Price, Daily Volume, Company Name, Sector
 * 
 * Connects to Finnhub WebSocket for real-time trade data and uses REST API
 * for daily volume as fallback/validation.
 */
export class RealMarketAdapter implements IPortfolioDataProvider {
  private socket: WebSocket | null = null;
  private isConnecting = false;
  private subscriptions = new Map<string, Array<(data: AssetData) => void>>();
  private subscribedSymbols = new Set<string>();
  private volumeData = new Map<string, { dailyVolume: number; lastUpdated: number }>();
  private priceCache = new Map<string, number>();
  private apiKey: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Portfolio symbols to subscribe to
  private readonly portfolioSymbols = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOGL'];

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[RealMarketAdapter] No Finnhub API key provided. Real-time data will not work.');
    }
  }

  async connect(): Promise<boolean> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return true;
    }
    if (this.isConnecting) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return (this.socket?.readyState ?? 0) === WebSocket.OPEN;
    }

    if (!this.apiKey) {
      // Return false instead of throwing to allow graceful degradation
      console.warn('[RealMarketAdapter] Finnhub API key is required. Set NEXT_PUBLIC_FINNHUB_API_KEY environment variable.');
      return false;
    }

    this.isConnecting = true;

    // Fetch initial volume data from REST API
    await this.fetchInitialVolumeData();

    const wsUrl = `wss://ws.finnhub.io?token=${this.apiKey}`;
    this.socket = new WebSocket(wsUrl);

    return await new Promise<boolean>((resolve, reject) => {
      if (!this.socket) {
        this.isConnecting = false;
        reject(new Error('Failed to create WebSocket instance'));
        return;
      }

      const connectionTimeout = setTimeout(() => {
        if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
          this.isConnecting = false;
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);

      this.socket.onopen = () => {
        clearTimeout(connectionTimeout);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Subscribe to all portfolio symbols
        this.portfolioSymbols.forEach(symbol => {
          this.subscribeToSymbol(symbol);
        });
        
        // Re-subscribe to any previously subscribed tickers
        this.subscribedSymbols.forEach(symbol => {
          if (!this.portfolioSymbols.includes(symbol)) {
            this.subscribeToSymbol(symbol);
          }
        });

        console.log('[RealMarketAdapter] Connected to Finnhub WebSocket');
        resolve(true);
      };

      this.socket.onerror = (event) => {
        clearTimeout(connectionTimeout);
        this.isConnecting = false;
        console.error('[RealMarketAdapter] WebSocket error:', event);
        reject(new Error('WebSocket connection failed'));
      };

      this.socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.isConnecting = false;
        console.warn('[RealMarketAdapter] WebSocket closed:', event.code, event.reason);
        
        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          
          // Handle trade messages
          if (msg.type === 'trade' && Array.isArray(msg.data)) {
            msg.data.forEach((trade: { p: number; v: number; t: number; s: string }) => {
              const symbol = trade.s;
              const price = trade.p;
              const volume = trade.v;
              
              if (!symbol || !price) return;

              // Update price cache
              const previousPrice = this.priceCache.get(symbol);
              this.priceCache.set(symbol, price);

              // Update volume (accumulate from trades)
              const currentVolume = this.volumeData.get(symbol);
              if (currentVolume) {
                // Add trade volume to daily volume
                currentVolume.dailyVolume += volume;
              }

              // Get jurisdiction from symbol (default to USA for US stocks)
              const jurisdiction = this.getJurisdictionFromSymbol(symbol);

              // Notify subscribers
              const listeners = this.subscriptions.get(symbol);
              if (listeners && listeners.length > 0) {
                const assetData: AssetData = {
                  ticker: symbol,
                  price: price,
                  currentPosition: undefined, // Keep simulated positions
                  jurisdiction,
                  lastUpdated: new Date().toISOString(),
                };

                // Include price direction metadata for flash effects
                (assetData as any).previousPrice = previousPrice;
                (assetData as any).priceDirection = previousPrice 
                  ? (price > previousPrice ? 'up' : price < previousPrice ? 'down' : 'same')
                  : undefined;

                listeners.forEach((cb) => cb(assetData));
              }
            });
          }
        } catch (error) {
          console.error('[RealMarketAdapter] Error parsing message:', error);
        }
      };
    });
  }

  private subscribeToSymbol(symbol: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    // Clean symbol (remove exchange suffixes for Finnhub)
    const cleanSymbol = symbol.split('.')[0].toUpperCase();

    try {
      this.socket.send(JSON.stringify({
        type: 'subscribe',
        symbol: cleanSymbol,
      }));
      this.subscribedSymbols.add(symbol);
      console.log(`[RealMarketAdapter] Subscribed to ${cleanSymbol}`);
    } catch (error) {
      console.error(`[RealMarketAdapter] Failed to subscribe to ${cleanSymbol}:`, error);
    }
  }

  subscribeToTicker(
    ticker: string,
    callback: (data: AssetData) => void
  ): void {
    const existing = this.subscriptions.get(ticker) ?? [];
    existing.push(callback);
    this.subscriptions.set(ticker, existing);

    // Subscribe via WebSocket if connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.subscribeToSymbol(ticker);
    }

    // If we have cached price data, fire immediately
    const cachedPrice = this.priceCache.get(ticker);
    if (cachedPrice) {
      const jurisdiction = this.getJurisdictionFromSymbol(ticker);
      callback({
        ticker,
        price: cachedPrice,
        jurisdiction,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);

    console.log(`[RealMarketAdapter] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      if (this.socket?.readyState !== WebSocket.OPEN) {
        this.connect().catch((error) => {
          console.error('[RealMarketAdapter] Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private async fetchInitialVolumeData(): Promise<void> {
    // Fetch daily volume for all portfolio symbols from REST API
    const symbols = [...this.portfolioSymbols];
    
    // Fetch in parallel with rate limiting
    const batchSize = 3;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            const cleanSymbol = symbol.split('.')[0];
            const url = `https://finnhub.io/api/v1/quote?symbol=${cleanSymbol}&token=${this.apiKey}`;
            const response = await fetch(url, {
              next: { revalidate: 0 },
            });

            if (response.ok) {
              const data = await response.json();
              if (data.v) { // v is daily volume
                this.volumeData.set(symbol, {
                  dailyVolume: data.v,
                  lastUpdated: Date.now(),
                });
                console.log(`[RealMarketAdapter] Fetched volume for ${symbol}: ${data.v.toLocaleString()}`);
              }
            }
          } catch (error) {
            console.error(`[RealMarketAdapter] Failed to fetch volume for ${symbol}:`, error);
          }
        })
      );

      // Rate limiting: wait between batches
      if (i + batchSize < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Get current daily volume for a symbol
   * Returns volume from WebSocket accumulation or REST API fallback
   */
  getDailyVolume(symbol: string): number {
    const volumeInfo = this.volumeData.get(symbol);
    return volumeInfo?.dailyVolume || 0;
  }

  /**
   * Calculate buying velocity as 1.5% of daily volume
   */
  calculateBuyingVelocity(symbol: string): number {
    const dailyVolume = this.getDailyVolume(symbol);
    if (dailyVolume === 0) {
      // Fallback to a reasonable default if no volume data
      return 1000;
    }
    return Math.max(100, Math.floor(dailyVolume * 0.015));
  }

  /**
   * Check if buying velocity is based on real volume data or fallback
   */
  hasRealVolumeData(symbol: string): boolean {
    const dailyVolume = this.getDailyVolume(symbol);
    return dailyVolume > 0;
  }

  private getJurisdictionFromSymbol(symbol: string): AssetData['jurisdiction'] {
    // Default to USA for US stocks
    if (symbol.includes('.HK')) return 'Hong Kong';
    if (symbol.includes('.KS') || symbol.includes('.T')) return 'APAC';
    if (symbol.includes('.')) return 'Other';
    return 'USA';
  }

  async getRegulatoryConfig(jurisdiction: string): Promise<any> {
    // Use existing regulatory config endpoint
    const res = await fetch(
      `/api/market-data/regulatory-config?jurisdiction=${encodeURIComponent(jurisdiction)}`,
      {
        method: 'GET',
        cache: 'no-store',
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

  dispose(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      // Unsubscribe from all symbols
      this.subscribedSymbols.forEach(symbol => {
        const cleanSymbol = symbol.split('.')[0].toUpperCase();
        try {
          this.socket?.send(JSON.stringify({
            type: 'unsubscribe',
            symbol: cleanSymbol,
          }));
        } catch (error) {
          // Ignore errors during cleanup
        }
      });

      this.socket.close();
      this.socket = null;
    }

    this.subscriptions.clear();
    this.subscribedSymbols.clear();
    this.volumeData.clear();
    this.priceCache.clear();
    this.reconnectAttempts = 0;
  }
}

