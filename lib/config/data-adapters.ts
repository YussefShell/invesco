/**
 * Configuration utility for Production Data Adapters
 * 
 * Centralizes all adapter configuration and provides validation.
 */

export interface DataAdapterConfig {
  marketData: {
    baseUrl: string;
    apiKey?: string;
    timeout: number;
    maxRetries: number;
  };
  regulatoryConfig: {
    baseUrl: string;
    apiKey?: string;
    timeout: number;
  };
  websocket: {
    baseUrl: string;
    authToken?: string;
    reconnectAttempts: number;
    reconnectDelay: number;
    heartbeatInterval: number;
    connectionTimeout: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    resetTimeout: number;
  };
}

/**
 * Get data adapter configuration from environment variables
 */
export function getDataAdapterConfig(): DataAdapterConfig {
  return {
    marketData: {
      baseUrl: process.env.MARKET_DATA_BASE_URL || "",
      apiKey: process.env.MARKET_DATA_API_KEY,
      timeout: parseInt(process.env.MARKET_DATA_TIMEOUT_MS || "5000", 10),
      maxRetries: parseInt(process.env.MARKET_DATA_MAX_RETRIES || "3", 10),
    },
    regulatoryConfig: {
      baseUrl: process.env.REG_CONFIG_BASE_URL || "",
      apiKey: process.env.REG_CONFIG_API_KEY,
      timeout: parseInt(process.env.REG_CONFIG_TIMEOUT_MS || "3000", 10),
    },
    websocket: {
      baseUrl: process.env.NEXT_PUBLIC_WS_BASE_URL || "",
      authToken: process.env.NEXT_PUBLIC_WS_AUTH_TOKEN,
      reconnectAttempts: parseInt(
        process.env.WS_RECONNECT_ATTEMPTS || "10",
        10
      ),
      reconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY_MS || "3000", 10),
      heartbeatInterval: parseInt(
        process.env.WS_HEARTBEAT_INTERVAL_MS || "30000",
        10
      ),
      connectionTimeout: parseInt(
        process.env.WS_CONNECTION_TIMEOUT_MS || "10000",
        10
      ),
    },
    circuitBreaker: {
      failureThreshold: parseInt(
        process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || "5",
        10
      ),
      resetTimeout: parseInt(
        process.env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS || "60000",
        10
      ),
    },
  };
}

/**
 * Validate adapter configuration
 */
export function validateConfig(config: DataAdapterConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Market data validation
  if (!config.marketData.baseUrl) {
    errors.push("MARKET_DATA_BASE_URL is required for REST production adapter");
  }

  // Regulatory config validation
  if (!config.regulatoryConfig.baseUrl) {
    errors.push(
      "REG_CONFIG_BASE_URL is required for regulatory configuration"
    );
  }

  // WebSocket validation (only if using WebSocket adapter)
  if (!config.websocket.baseUrl) {
    errors.push(
      "NEXT_PUBLIC_WS_BASE_URL is required for WebSocket production adapter"
    );
  }

  // Timeout validation
  if (config.marketData.timeout <= 0) {
    errors.push("MARKET_DATA_TIMEOUT_MS must be greater than 0");
  }

  if (config.regulatoryConfig.timeout <= 0) {
    errors.push("REG_CONFIG_TIMEOUT_MS must be greater than 0");
  }

  // Retry validation
  if (config.marketData.maxRetries < 0) {
    errors.push("MARKET_DATA_MAX_RETRIES must be non-negative");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if production adapters are configured
 */
export function isProductionConfigured(): boolean {
  const config = getDataAdapterConfig();
  const validation = validateConfig(config);
  return validation.valid;
}

