import type { AssetData } from "@/types";
import type { IPortfolioDataProvider } from "@/lib/types/IDataProvider";
import {
  getMarketDataGenerator,
  type RealisticMarketDataGenerator,
} from "@/lib/market-data-generator";

/**
 * High-Fidelity Charles River Development (CRD) Adapter Simulation
 * 
 * Generates realistic FIX protocol messages and parses Execution Reports
 * to drive the Velocity Engine for real-time risk calculations.
 * 
 * FIX Message Format:
 * 8=FIX.4.4|9=length|35=MsgType|...|10=Checksum
 * 
 * Key FIX Tags:
 * - 8: BeginString (FIX version)
 * - 35: MsgType (D=NewOrderSingle, 8=ExecutionReport)
 * - 55: Symbol
 * - 54: Side (1=Buy, 2=Sell)
 * - 38: OrderQty
 * - 44: Price
 * - 150: ExecType (0=New, F=Trade)
 * - 14: CumQty (cumulative quantity executed)
 */
export class CharlesRiverAdapter implements IPortfolioDataProvider {
  private subscribers = new Map<string, Array<(data: AssetData) => void>>();
  private fixMessageInterval: ReturnType<typeof setInterval> | null = null;
  private generator: RealisticMarketDataGenerator;
  private fixConfig: {
    gatewayHost: string;
    senderCompID: string;
    targetCompID: string;
    sessionType: "Drop Copy" | "Trade Capture";
  };
  private onFixMessage?: (rawFix: string, parsed: any) => void;
  private isConnected = false;

  // Common tickers for realistic simulation
  private readonly tickers = [
    "NVDA", "TSLA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NFLX",
    "AMD", "INTC", "JPM", "BAC", "GS", "V", "MA", "WMT", "JNJ", "PG"
  ];

  constructor(
    fixConfig?: {
      gatewayHost: string;
      senderCompID: string;
      targetCompID: string;
      sessionType: "Drop Copy" | "Trade Capture";
    },
    onFixMessage?: (rawFix: string, parsed: any) => void
  ) {
    this.generator = getMarketDataGenerator();
    this.fixConfig = fixConfig || {
      gatewayHost: "fix.invesco.internal",
      senderCompID: "INVESCO-RISK-ENGINE",
      targetCompID: "CRD-FIX-GATEWAY",
      sessionType: "Drop Copy",
    };
    this.onFixMessage = onFixMessage;
  }

  async connect(): Promise<boolean> {
    // Simulate FIX session logon
    await new Promise((resolve) => setTimeout(resolve, 1500));

    this.isConnected = true;

    // Start generating FIX Execution Reports
    this.startFixMessageGeneration();

    return true;
  }

  subscribeToTicker(
    ticker: string,
    callback: (data: AssetData) => void
  ): void {
    const existing = this.subscribers.get(ticker) ?? [];
    existing.push(callback);
    this.subscribers.set(ticker, existing);

    // Send initial data snapshot
    const baseData = this.generator.generatePriceUpdate(ticker);
    if (baseData) {
      callback(baseData);
    }
  }

  async getRegulatoryConfig(jurisdiction: string): Promise<any> {
    return Promise.resolve({
      jurisdiction,
      rules: [],
      source: "Live Production (Charles River / FIX)",
    });
  }

  /**
   * Start generating realistic FIX Execution Reports
   */
  private startFixMessageGeneration(): void {
    if (this.fixMessageInterval) {
      return;
    }

    // Generate FIX messages every 2-4 seconds
    this.fixMessageInterval = setInterval(() => {
      this.generateFixExecutionReport();
    }, 2000 + Math.random() * 2000);
  }

  /**
   * Generate a realistic FIX Execution Report (MsgType=8)
   * 
   * Example: 8=FIX.4.4|9=123|35=8|55=NVDA|54=1|38=5000|44=450.25|150=F|14=5000|10=123|
   */
  private generateFixExecutionReport(): void {
    const ticker = this.tickers[Math.floor(Math.random() * this.tickers.length)];
    const side = Math.random() > 0.5 ? "1" : "2"; // 1=Buy, 2=Sell
    const quantity = Math.floor(1000 + Math.random() * 20000); // 1K-21K shares
    const price = 50 + Math.random() * 500; // Realistic price range
    const execType = "F"; // Trade (fully executed)
    const cumQty = quantity; // Fully filled

    // Build FIX message
    const fixFields: string[] = [
      "8=FIX.4.4",
      `35=8`, // ExecutionReport
      `55=${ticker}`,
      `54=${side}`,
      `38=${quantity}`,
      `44=${price.toFixed(2)}`,
      `150=${execType}`,
      `14=${cumQty}`,
      `17=${this.generateClOrdID()}`, // OrderID
      `37=${this.generateOrderID()}`, // OrderID
      `11=${this.generateClOrdID()}`, // ClOrdID
      `20=0`, // ExecTransType (New)
      `39=2`, // OrdStatus (Partially filled)
      `59=0`, // TimeInForce (Day)
      `60=${this.getFixTimestamp()}`, // TransactTime
    ];

    // Calculate message length (field 9)
    const body = fixFields.join("|");
    const bodyLength = body.length;
    fixFields.unshift(`9=${bodyLength}`);

    // Add checksum (field 10) - simplified checksum calculation
    const checksum = this.calculateFixChecksum(fixFields.join("|"));
    fixFields.push(`10=${checksum}`);

    const rawFix = fixFields.join("|");

    // Parse the FIX message
    const parsed = this.parseFixMessage(rawFix);

    // Emit to callback if provided
    if (this.onFixMessage) {
      this.onFixMessage(rawFix, parsed);
    }

    // Update subscribers with the execution data
    this.updateSubscribersFromFix(parsed);
  }

  /**
   * Parse a FIX message into a structured object
   */
  private parseFixMessage(rawFix: string): {
    msgType: string;
    symbol: string;
    side: "1" | "2";
    quantity: number;
    price: number;
    execType: string;
    cumQty: number;
    timestamp: string;
  } {
    const fields: Record<string, string> = {};
    const parts = rawFix.split("|");

    for (const part of parts) {
      const [tag, value] = part.split("=");
      if (tag && value) {
        fields[tag] = value;
      }
    }

    return {
      msgType: fields["35"] || "",
      symbol: fields["55"] || "",
      side: (fields["54"] as "1" | "2") || "1",
      quantity: parseInt(fields["38"] || "0", 10),
      price: parseFloat(fields["44"] || "0"),
      execType: fields["150"] || "",
      cumQty: parseInt(fields["14"] || "0", 10),
      timestamp: fields["60"] || new Date().toISOString(),
    };
  }

  /**
   * Update subscribers based on FIX Execution Report
   * This drives the Velocity Engine for risk calculations
   */
  private updateSubscribersFromFix(parsed: {
    symbol: string;
    side: "1" | "2";
    quantity: number;
    price: number;
  }): void {
    const callbacks = this.subscribers.get(parsed.symbol);
    if (!callbacks) {
      return;
    }

    // Get base data from generator
    const baseData = this.generator.generatePriceUpdate(parsed.symbol);
    if (!baseData) {
      return;
    }

    // Update with execution data
    const assetData: AssetData = {
      ...baseData,
      price: parsed.price,
      // Calculate position change based on side and quantity
      currentPosition: baseData.currentPosition
        ? baseData.currentPosition + (parsed.side === "1" ? parsed.quantity * 0.001 : -parsed.quantity * 0.001)
        : parsed.quantity * 0.001,
      lastUpdated: new Date().toISOString(),
    };

    callbacks.forEach((cb) => cb(assetData));
  }

  /**
   * Generate a unique ClOrdID (Client Order ID)
   */
  private generateClOrdID(): string {
    return `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Generate a unique OrderID
   */
  private generateOrderID(): string {
    return `CRD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Get FIX-formatted timestamp (YYYYMMDD-HH:mm:ss)
   */
  private getFixTimestamp(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    const hours = String(now.getUTCHours()).padStart(2, "0");
    const minutes = String(now.getUTCMinutes()).padStart(2, "0");
    const seconds = String(now.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}-${hours}:${minutes}:${seconds}`;
  }

  /**
   * Calculate FIX checksum (simplified - sum of all bytes mod 256)
   */
  private calculateFixChecksum(message: string): string {
    let sum = 0;
    for (let i = 0; i < message.length; i++) {
      sum += message.charCodeAt(i);
    }
    const checksum = sum % 256;
    return String(checksum).padStart(3, "0");
  }

  /**
   * Clean up intervals when adapter is disposed
   */
  dispose(): void {
    if (this.fixMessageInterval) {
      clearInterval(this.fixMessageInterval);
      this.fixMessageInterval = null;
    }
    this.isConnected = false;
  }
}
