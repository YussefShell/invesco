import type { AssetData } from "@/types";

/**
 * Strict data provider contract for the portfolio/risk engine.
 *
 * Concrete adapters (e.g. Mock, Charles River / Kafka) must implement this.
 * The UI only talks to this interface, never to implementation details.
 */
export interface IPortfolioDataProvider {
  /**
   * Establish a connection to the underlying data source.
   *
   * Returns true on success, otherwise throws an error to be surfaced in the UI.
   */
  connect(): Promise<boolean>;

  /**
   * Subscribe to real-time updates for a given ticker.
   *
   * The callback will be invoked whenever new data is available.
   */
  subscribeToTicker(
    ticker: string,
    callback: (data: AssetData) => void
  ): void;

  /**
   * Retrieve jurisdiction-specific regulatory configuration.
   *
   * In production this would call out to a rules engine or config service.
   */
  getRegulatoryConfig(jurisdiction: string): Promise<any>;
}




