import type { AssetData } from "@/types";
import type { IPortfolioDataProvider } from "@/lib/types/IDataProvider";

/**
 * Placeholder for a real Charles River / Kafka production adapter.
 *
 * The implementation deliberately fails on connect() after a delay to
 * demonstrate that the UI is attempting to reach a real backend system.
 */
export class CharlesRiverAdapter implements IPortfolioDataProvider {
  subscribeToTicker(_ticker: string, _callback: (data: AssetData) => void): void {
    // No-op for now – in a real implementation this would wire up to FIX/Kafka.
  }

  async connect(): Promise<boolean> {
    // Simulate a 2 second network handshake / SSL negotiation.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Intentionally fail to prove the app is trying to connect to "Prod".
    throw new Error(
      "CONNECTION FAILED: Invalid SSL Certificate (Prod-281-FIX)"
    );
  }

  async getRegulatoryConfig(jurisdiction: string): Promise<any> {
    // Placeholder shape to show that this is wired for real integration.
    return Promise.resolve({
      jurisdiction,
      rules: [],
      source: "Live Production (Kafka/CRD)",
      // In a real adapter, we'd include versioned config from CRD / rules engine.
    });
  }
}


