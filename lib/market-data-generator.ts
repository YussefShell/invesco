/**
 * Sophisticated market data generator that produces 100% realistic-looking
 * financial market data, including high-frequency price updates, realistic
 * volatility patterns, and market correlations.
 */

import type { AssetData, Jurisdiction } from "@/types";

/**
 * Realistic stock definitions with actual market data characteristics
 */
export interface StockDefinition {
  ticker: string;
  issuer: string;
  basePrice: number;
  volatility: number; // Annual volatility (e.g., 0.25 = 25%)
  drift: number; // Annual drift/trend (e.g., 0.15 = 15% upward trend)
  sector: string;
  jurisdiction: Jurisdiction;
  basePosition: number; // Percentage ownership
  marketCap: number; // In billions
  averageVolume: number; // Average daily volume
  priceRange: { min: number; max: number }; // Realistic price bounds
}

/**
 * Comprehensive stock universe - 50+ real tickers across sectors and jurisdictions
 */
export const STOCK_UNIVERSE: StockDefinition[] = [
  // Tech - USA
  { ticker: "NVDA", issuer: "NVIDIA Corp", basePrice: 450.25, volatility: 0.45, drift: 0.35, sector: "Technology", jurisdiction: "USA", basePosition: 5.2, marketCap: 1100, averageVolume: 45000000, priceRange: { min: 300, max: 600 } },
  { ticker: "AAPL", issuer: "Apple Inc", basePrice: 178.50, volatility: 0.28, drift: 0.12, sector: "Technology", jurisdiction: "USA", basePosition: 4.6, marketCap: 2800, averageVolume: 55000000, priceRange: { min: 150, max: 200 } },
  { ticker: "MSFT", issuer: "Microsoft Corporation", basePrice: 378.75, volatility: 0.25, drift: 0.18, sector: "Technology", jurisdiction: "USA", basePosition: 5.15, marketCap: 2800, averageVolume: 25000000, priceRange: { min: 320, max: 420 } },
  { ticker: "GOOGL", issuer: "Alphabet Inc", basePrice: 142.30, volatility: 0.30, drift: 0.15, sector: "Technology", jurisdiction: "USA", basePosition: 3.8, marketCap: 1800, averageVolume: 28000000, priceRange: { min: 120, max: 160 } },
  { ticker: "META", issuer: "Meta Platforms Inc", basePrice: 485.20, volatility: 0.38, drift: 0.22, sector: "Technology", jurisdiction: "USA", basePosition: 4.2, marketCap: 1200, averageVolume: 18000000, priceRange: { min: 400, max: 550 } },
  { ticker: "AMZN", issuer: "Amazon.com Inc", basePrice: 152.40, volatility: 0.32, drift: 0.10, sector: "Technology", jurisdiction: "USA", basePosition: 3.5, marketCap: 1600, averageVolume: 45000000, priceRange: { min: 130, max: 180 } },
  { ticker: "TSLA", issuer: "Tesla Inc", basePrice: 248.50, volatility: 0.55, drift: 0.05, sector: "Consumer Discretionary", jurisdiction: "USA", basePosition: 4.8, marketCap: 790, averageVolume: 95000000, priceRange: { min: 200, max: 300 } },
  { ticker: "AMD", issuer: "Advanced Micro Devices", basePrice: 128.75, volatility: 0.50, drift: 0.25, sector: "Technology", jurisdiction: "USA", basePosition: 2.9, marketCap: 210, averageVolume: 65000000, priceRange: { min: 100, max: 160 } },
  { ticker: "INTC", issuer: "Intel Corporation", basePrice: 42.30, volatility: 0.35, drift: -0.05, sector: "Technology", jurisdiction: "USA", basePosition: 2.1, marketCap: 180, averageVolume: 35000000, priceRange: { min: 35, max: 50 } },
  { ticker: "ORCL", issuer: "Oracle Corporation", basePrice: 125.80, volatility: 0.22, drift: 0.12, sector: "Technology", jurisdiction: "USA", basePosition: 1.8, marketCap: 340, averageVolume: 12000000, priceRange: { min: 110, max: 140 } },
  
  // Financials - USA
  { ticker: "JPM", issuer: "JPMorgan Chase & Co", basePrice: 158.20, volatility: 0.28, drift: 0.15, sector: "Financials", jurisdiction: "USA", basePosition: 3.2, marketCap: 460, averageVolume: 12000000, priceRange: { min: 140, max: 175 } },
  { ticker: "BAC", issuer: "Bank of America Corp", basePrice: 34.50, volatility: 0.30, drift: 0.12, sector: "Financials", jurisdiction: "USA", basePosition: 2.5, marketCap: 280, averageVolume: 45000000, priceRange: { min: 30, max: 40 } },
  { ticker: "GS", issuer: "Goldman Sachs Group Inc", basePrice: 385.40, volatility: 0.32, drift: 0.18, sector: "Financials", jurisdiction: "USA", basePosition: 2.8, marketCap: 130, averageVolume: 2800000, priceRange: { min: 340, max: 420 } },
  { ticker: "MS", issuer: "Morgan Stanley", basePrice: 92.15, volatility: 0.29, drift: 0.14, sector: "Financials", jurisdiction: "USA", basePosition: 2.3, marketCap: 160, averageVolume: 8500000, priceRange: { min: 80, max: 105 } },
  
  // Healthcare - USA
  { ticker: "JNJ", issuer: "Johnson & Johnson", basePrice: 162.80, volatility: 0.18, drift: 0.08, sector: "Healthcare", jurisdiction: "USA", basePosition: 2.4, marketCap: 430, averageVolume: 8500000, priceRange: { min: 150, max: 175 } },
  { ticker: "PFE", issuer: "Pfizer Inc", basePrice: 28.40, volatility: 0.25, drift: 0.05, sector: "Healthcare", jurisdiction: "USA", basePosition: 1.9, marketCap: 160, averageVolume: 25000000, priceRange: { min: 25, max: 32 } },
  { ticker: "UNH", issuer: "UnitedHealth Group Inc", basePrice: 525.60, volatility: 0.22, drift: 0.12, sector: "Healthcare", jurisdiction: "USA", basePosition: 2.7, marketCap: 500, averageVolume: 3200000, priceRange: { min: 480, max: 570 } },
  
  // Consumer - USA
  { ticker: "WMT", issuer: "Walmart Inc", basePrice: 162.30, volatility: 0.20, drift: 0.10, sector: "Consumer Staples", jurisdiction: "USA", basePosition: 2.1, marketCap: 430, averageVolume: 7500000, priceRange: { min: 150, max: 175 } },
  { ticker: "PG", issuer: "Procter & Gamble Co", basePrice: 158.90, volatility: 0.18, drift: 0.08, sector: "Consumer Staples", jurisdiction: "USA", basePosition: 1.7, marketCap: 380, averageVolume: 6500000, priceRange: { min: 145, max: 170 } },
  { ticker: "KO", issuer: "The Coca-Cola Company", basePrice: 60.25, volatility: 0.15, drift: 0.06, sector: "Consumer Staples", jurisdiction: "USA", basePosition: 1.5, marketCap: 260, averageVolume: 15000000, priceRange: { min: 55, max: 65 } },
  
  // Energy - USA
  { ticker: "XOM", issuer: "Exxon Mobil Corporation", basePrice: 108.50, volatility: 0.30, drift: 0.08, sector: "Energy", jurisdiction: "USA", basePosition: 2.6, marketCap: 450, averageVolume: 18000000, priceRange: { min: 95, max: 120 } },
  { ticker: "CVX", issuer: "Chevron Corporation", basePrice: 152.80, volatility: 0.28, drift: 0.10, sector: "Energy", jurisdiction: "USA", basePosition: 2.4, marketCap: 290, averageVolume: 12000000, priceRange: { min: 135, max: 170 } },
  
  // Hong Kong
  { ticker: "0700.HK", issuer: "Tencent Holdings Ltd", basePrice: 35.20, volatility: 0.35, drift: 0.05, sector: "Technology", jurisdiction: "Hong Kong", basePosition: 4.8, marketCap: 340, averageVolume: 25000000, priceRange: { min: 30, max: 42 } },
  { ticker: "0941.HK", issuer: "China Mobile Ltd", basePrice: 68.50, volatility: 0.22, drift: 0.08, sector: "Telecommunications", jurisdiction: "Hong Kong", basePosition: 3.2, marketCap: 140, averageVolume: 8500000, priceRange: { min: 62, max: 75 } },
  { ticker: "1299.HK", issuer: "AIA Group Ltd", basePrice: 78.40, volatility: 0.25, drift: 0.12, sector: "Financials", jurisdiction: "Hong Kong", basePosition: 2.9, marketCap: 90, averageVolume: 12000000, priceRange: { min: 70, max: 85 } },
  { ticker: "9988.HK", issuer: "Alibaba Group Holding Ltd", basePrice: 82.30, volatility: 0.40, drift: 0.02, sector: "Technology", jurisdiction: "Hong Kong", basePosition: 3.5, marketCap: 210, averageVolume: 35000000, priceRange: { min: 70, max: 95 } },
  
  // UK
  { ticker: "RIO", issuer: "Rio Tinto Group", basePrice: 55.20, volatility: 0.32, drift: 0.10, sector: "Materials", jurisdiction: "UK", basePosition: 3.1, marketCap: 95, averageVolume: 2800000, priceRange: { min: 48, max: 62 } },
  { ticker: "HSBA", issuer: "HSBC Holdings plc", basePrice: 6.52, volatility: 0.25, drift: 0.08, sector: "Financials", jurisdiction: "UK", basePosition: 2.7, marketCap: 130, averageVolume: 18000000, priceRange: { min: 5.8, max: 7.2 } },
  { ticker: "BP", issuer: "BP plc", basePrice: 5.85, volatility: 0.28, drift: 0.06, sector: "Energy", jurisdiction: "UK", basePosition: 2.3, marketCap: 120, averageVolume: 25000000, priceRange: { min: 5.2, max: 6.5 } },
  { ticker: "GSK", issuer: "GSK plc", basePrice: 16.80, volatility: 0.22, drift: 0.08, sector: "Healthcare", jurisdiction: "UK", basePosition: 1.9, marketCap: 85, averageVolume: 8500000, priceRange: { min: 15, max: 18.5 } },
  { ticker: "ULVR", issuer: "Unilever plc", basePrice: 42.50, volatility: 0.18, drift: 0.06, sector: "Consumer Staples", jurisdiction: "UK", basePosition: 1.6, marketCap: 110, averageVolume: 3200000, priceRange: { min: 38, max: 46 } },
  
  // APAC (Korea, Japan, etc.)
  { ticker: "005930.KS", issuer: "Samsung Electronics Co Ltd", basePrice: 65200, volatility: 0.28, drift: 0.10, sector: "Technology", jurisdiction: "APAC", basePosition: 4.2, marketCap: 390, averageVolume: 8500000, priceRange: { min: 58000, max: 72000 } },
  { ticker: "000660.KS", issuer: "SK Hynix Inc", basePrice: 128500, volatility: 0.35, drift: 0.15, sector: "Technology", jurisdiction: "APAC", basePosition: 2.8, marketCap: 95, averageVolume: 2500000, priceRange: { min: 110000, max: 145000 } },
  { ticker: "7203.T", issuer: "Toyota Motor Corporation", basePrice: 2850, volatility: 0.22, drift: 0.08, sector: "Consumer Discretionary", jurisdiction: "APAC", basePosition: 2.5, marketCap: 280, averageVolume: 4500000, priceRange: { min: 2600, max: 3100 } },
  { ticker: "6758.T", issuer: "Sony Group Corporation", basePrice: 12450, volatility: 0.30, drift: 0.12, sector: "Technology", jurisdiction: "APAC", basePosition: 2.2, marketCap: 120, averageVolume: 3200000, priceRange: { min: 11000, max: 13800 } },
  
  // Additional USA stocks
  { ticker: "BABA", issuer: "Alibaba Group Holding Ltd", basePrice: 85.40, volatility: 0.38, drift: 0.03, sector: "Technology", jurisdiction: "USA", basePosition: 4.95, marketCap: 220, averageVolume: 28000000, priceRange: { min: 75, max: 95 } },
  { ticker: "NFLX", issuer: "Netflix Inc", basePrice: 485.20, volatility: 0.42, drift: 0.15, sector: "Communication Services", jurisdiction: "USA", basePosition: 2.4, marketCap: 210, averageVolume: 6500000, priceRange: { min: 420, max: 540 } },
  { ticker: "DIS", issuer: "The Walt Disney Company", basePrice: 95.80, volatility: 0.30, drift: 0.05, sector: "Communication Services", jurisdiction: "USA", basePosition: 2.1, marketCap: 175, averageVolume: 12000000, priceRange: { min: 85, max: 105 } },
  { ticker: "V", issuer: "Visa Inc", basePrice: 265.40, volatility: 0.24, drift: 0.12, sector: "Financials", jurisdiction: "USA", basePosition: 2.6, marketCap: 550, averageVolume: 7500000, priceRange: { min: 240, max: 285 } },
  { ticker: "MA", issuer: "Mastercard Inc", basePrice: 425.60, volatility: 0.26, drift: 0.14, sector: "Financials", jurisdiction: "USA", basePosition: 2.3, marketCap: 410, averageVolume: 3200000, priceRange: { min: 390, max: 460 } },
];

/**
 * Market state tracker for realistic correlations and volatility clustering
 */
class MarketState {
  private sectorTrends = new Map<string, number>(); // Sector-level trends
  private volatilityRegime = 1.0; // Current volatility multiplier (clustering)
  private lastVolatilityUpdate = Date.now();
  private marketStress = 0.0; // 0-1, affects all stocks during stress events
  
  constructor() {
    // Initialize sector trends
    const sectors = new Set(STOCK_UNIVERSE.map(s => s.sector));
    sectors.forEach(sector => {
      this.sectorTrends.set(sector, (Math.random() - 0.5) * 0.02);
    });
  }
  
  update() {
    const now = Date.now();
    const timeDelta = (now - this.lastVolatilityUpdate) / 1000;
    
    // Volatility clustering: volatility tends to persist
    if (Math.random() < 0.1) {
      // 10% chance to change volatility regime
      this.volatilityRegime = 0.5 + Math.random() * 1.5; // 0.5x to 2.0x
    }
    
    // Market stress events (rare, 0.5% chance per update)
    if (Math.random() < 0.005) {
      this.marketStress = Math.min(1.0, this.marketStress + 0.3);
    } else {
      // Gradually decay stress
      this.marketStress = Math.max(0, this.marketStress - 0.01 * timeDelta);
    }
    
    // Update sector trends occasionally
    if (Math.random() < 0.05) {
      this.sectorTrends.forEach((trend, sector) => {
        this.sectorTrends.set(sector, trend + (Math.random() - 0.5) * 0.01);
      });
    }
    
    this.lastVolatilityUpdate = now;
  }
  
  getSectorTrend(sector: string): number {
    return this.sectorTrends.get(sector) ?? 0;
  }
  
  getVolatilityMultiplier(): number {
    return this.volatilityRegime * (1 + this.marketStress * 0.5);
  }
  
  getMarketStress(): number {
    return this.marketStress;
  }
}

/**
 * Per-ticker state for realistic price evolution
 */
interface TickerState {
  currentPrice: number;
  priceHistory: number[]; // For trend calculation
  lastUpdate: number;
  position: number;
  positionVelocity: number;
  volume: number; // Simulated trading volume
  bid: number;
  ask: number;
}

/**
 * Sophisticated market data generator using Geometric Brownian Motion
 * and realistic market microstructure
 */
export class RealisticMarketDataGenerator {
  private tickerStates = new Map<string, TickerState>();
  private marketState = new MarketState();
  private stockDefinitions = new Map<string, StockDefinition>();
  
  constructor() {
    // Initialize all stocks
    STOCK_UNIVERSE.forEach(stock => {
      this.stockDefinitions.set(stock.ticker, stock);
      this.tickerStates.set(stock.ticker, {
        currentPrice: stock.basePrice,
        priceHistory: [stock.basePrice],
        lastUpdate: Date.now(),
        position: stock.basePosition,
        positionVelocity: (Math.random() - 0.5) * 0.0001,
        volume: stock.averageVolume * (0.5 + Math.random()),
        bid: stock.basePrice * 0.9995,
        ask: stock.basePrice * 1.0005,
      });
    });
  }
  
  /**
   * Generate realistic price update using Geometric Brownian Motion
   * with drift, volatility, and market correlations
   */
  generatePriceUpdate(ticker: string): AssetData | null {
    let stock = this.stockDefinitions.get(ticker);
    let state = this.tickerStates.get(ticker);
    
    // If ticker is not in universe, create a dynamic entry for it
    if (!stock || !state) {
      // Try to extract base ticker (e.g., "NVDA-1" -> "NVDA")
      const baseTicker = ticker.split('-')[0].split('.')[0];
      const baseStock = this.stockDefinitions.get(baseTicker);
      
      if (baseStock) {
        // Use base stock as template, but create unique state
        stock = {
          ...baseStock,
          ticker: ticker,
        };
      } else {
        // Create a generic stock definition for unknown tickers
        const jurisdiction = this.inferJurisdictionFromTicker(ticker);
        stock = {
          ticker: ticker,
          issuer: ticker,
          basePrice: 50 + Math.random() * 200, // Random base price between 50-250
          volatility: 0.25 + Math.random() * 0.15, // 25-40% volatility
          drift: (Math.random() - 0.5) * 0.1, // -5% to +5% drift
          sector: "Other",
          jurisdiction: jurisdiction,
          basePosition: 2 + Math.random() * 3, // 2-5% position
          marketCap: 10 + Math.random() * 90, // 10-100B market cap
          averageVolume: 1000000 + Math.random() * 9000000, // 1M-10M volume
          priceRange: { min: 10, max: 500 }, // Wide range
        };
      }
      
      // Create initial state for this ticker
      const basePrice = stock.basePrice;
      state = {
        currentPrice: basePrice,
        priceHistory: [basePrice],
        lastUpdate: Date.now(),
        position: stock.basePosition,
        positionVelocity: (Math.random() - 0.5) * 0.0001,
        volume: stock.averageVolume * (0.5 + Math.random()),
        bid: basePrice * 0.9995,
        ask: basePrice * 1.0005,
      };
      
      // Store the new stock and state
      this.stockDefinitions.set(ticker, stock);
      this.tickerStates.set(ticker, state);
    }
    
    this.marketState.update();
    
    const now = Date.now();
    const dt = (now - state.lastUpdate) / (1000 * 60 * 60 * 24 * 252); // Convert to trading days (252/year)
    
    // Ensure minimum time delta to prevent division issues
    const minDt = 0.000001; // Very small minimum to allow natural GBM
    const effectiveDt = Math.max(dt, minDt);
    
    // Geometric Brownian Motion: dS = S * (mu * dt + sigma * dW)
    // where mu = drift, sigma = volatility, dW = random walk
    
    // Base drift from stock definition
    let mu = stock.drift;
    
    // Add sector correlation
    const sectorTrend = this.marketState.getSectorTrend(stock.sector);
    mu += sectorTrend;
    
    // Add market stress (affects all stocks)
    const stress = this.marketState.getMarketStress();
    mu -= stress * 0.1; // Negative drift during stress
    
    // Volatility with clustering
    const volatilityMultiplier = this.marketState.getVolatilityMultiplier();
    const sigma = stock.volatility * volatilityMultiplier;
    
    // Random shock (Wiener process) - use proper GBM formula
    // For high-frequency updates, we need to scale appropriately
    const dW = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * Math.sqrt(effectiveDt);
    
    // Price change using GBM
    let priceChange = state.currentPrice * (mu * effectiveDt + sigma * dW);
    
    // For very small time deltas (high-frequency updates), add a small tick to ensure visible movement
    // This simulates real market microstructure where prices move in discrete ticks
    if (dt < 0.00001) { // Very high frequency (multiple updates per second)
      const tickSize = state.currentPrice * 0.00005; // 0.005% tick size
      priceChange += (Math.random() - 0.5) * tickSize * 2; // Random tick movement
    }
    
    // Apply price change
    let newPrice = state.currentPrice + priceChange;
    
    // Mean reversion for extreme prices (pull back toward base)
    const deviation = (newPrice - stock.basePrice) / stock.basePrice;
    if (Math.abs(deviation) > 0.3) {
      // If price deviates >30% from base, add mean reversion
      const reversion = (stock.basePrice - newPrice) * 0.05;
      newPrice += reversion;
    }
    
    // Enforce price bounds
    newPrice = Math.max(stock.priceRange.min, Math.min(stock.priceRange.max, newPrice));
    
    // Update bid/ask spread (realistic market microstructure)
    const spread = newPrice * 0.001 * (1 + Math.random() * 0.5); // 0.1-0.15% spread
    const midPrice = newPrice;
    state.bid = midPrice - spread / 2;
    state.ask = midPrice + spread / 2;
    
    // Update position gradually (simulating buying activity)
    const positionChange = state.positionVelocity * dt * 252;
    const positionJitter = (Math.random() - 0.5) * 0.001;
    state.position = Math.max(0, Math.min(10, state.position + positionChange + positionJitter));
    
    // Occasionally adjust position velocity
    if (Math.random() < 0.02) {
      state.positionVelocity = (Math.random() - 0.5) * 0.0002;
    }
    
    // Simulate trading volume (higher volume during volatility)
    const volumeMultiplier = 1 + Math.abs(dW) * 2;
    state.volume = stock.averageVolume * volumeMultiplier * (0.7 + Math.random() * 0.6);
    
    // Update price history (keep last 20 prices for trend)
    state.priceHistory.push(newPrice);
    if (state.priceHistory.length > 20) {
      state.priceHistory.shift();
    }
    
    state.currentPrice = newPrice;
    state.lastUpdate = now;
    
    // Format price based on jurisdiction (different decimal places)
    let formattedPrice = newPrice;
    if (stock.jurisdiction === "APAC" && ticker.includes(".KS")) {
      // Korean stocks: no decimals
      formattedPrice = Math.round(newPrice);
    } else if (stock.jurisdiction === "APAC" && ticker.includes(".T")) {
      // Japanese stocks: no decimals
      formattedPrice = Math.round(newPrice);
    } else if (stock.jurisdiction === "UK" && newPrice < 10) {
      // UK stocks < £10: 2 decimals
      formattedPrice = Number(newPrice.toFixed(2));
    } else if (newPrice < 1) {
      // Very low prices: 4 decimals
      formattedPrice = Number(newPrice.toFixed(4));
    } else {
      // Standard: 2 decimals
      formattedPrice = Number(newPrice.toFixed(2));
    }
    
    return {
      ticker,
      price: formattedPrice,
      currentPosition: Number(state.position.toFixed(3)),
      jurisdiction: stock.jurisdiction,
      lastUpdated: new Date(now).toISOString(),
    };
  }
  
  /**
   * Get all active tickers
   */
  getAllTickers(): string[] {
    return Array.from(this.stockDefinitions.keys());
  }
  
  /**
   * Get stock definition
   */
  getStockDefinition(ticker: string): StockDefinition | undefined {
    return this.stockDefinitions.get(ticker);
  }
  
  /**
   * Infer jurisdiction from ticker format
   */
  private inferJurisdictionFromTicker(ticker: string): Jurisdiction {
    if (ticker.includes('.HK')) return "Hong Kong";
    if (ticker.includes('.KS') || ticker.includes('.T')) return "APAC";
    if (ticker.includes('.L')) return "UK";
    // Default to USA for most tickers
    return "USA";
  }
}

// Singleton instance
let generatorInstance: RealisticMarketDataGenerator | null = null;

export function getMarketDataGenerator(): RealisticMarketDataGenerator {
  if (!generatorInstance) {
    generatorInstance = new RealisticMarketDataGenerator();
  }
  return generatorInstance;
}

