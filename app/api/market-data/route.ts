"use server";

import { NextResponse } from "next/server";
import type { AssetData, Jurisdiction } from "@/types";
import { getDataAdapterConfig } from "@/lib/config/data-adapters";
import { CircuitBreaker } from "@/lib/utils/circuit-breaker";
import { Logger } from "@/lib/utils/logger";

const logger = new Logger("MarketDataAPI");
const config = getDataAdapterConfig();

// Circuit breaker instance (shared across requests)
const circuitBreaker = new CircuitBreaker({
  failureThreshold: config.circuitBreaker.failureThreshold,
  resetTimeout: config.circuitBreaker.resetTimeout,
});

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = config.marketData.maxRetries
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        options,
        config.marketData.timeout
      );

      if (response.ok) {
        circuitBreaker.recordSuccess();
        return response;
      }

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        circuitBreaker.recordFailure();
        return response;
      }

      // Retry on 5xx errors
      lastError = new Error(`HTTP ${response.status}`);
      logger.warn("Upstream error, will retry", {
        status: response.status,
        attempt: attempt + 1,
        maxRetries,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
        logger.debug("Retrying after delay", {
          attempt: attempt + 1,
          delay,
          error: lastError.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  circuitBreaker.recordFailure();
  throw lastError || new Error("Max retries exceeded");
}

/**
 * Server-side adapter endpoint that proxies to an upstream market data gateway
 * (e.g. REST/gRPC sitting in front of Kafka/CRD or a FIX bridge).
 *
 * This keeps your browser code unaware of internal network details.
 *
 * Expected upstream:
 *   - BASE_URL: process.env.MARKET_DATA_BASE_URL
 *   - GET /v1/quotes?ticker=NVDA&jurisdiction=USA
 *     -> { ticker, price, position, jurisdiction, asOf }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const jurisdiction = searchParams.get("jurisdiction") as Jurisdiction | null;

  if (!ticker) {
    return NextResponse.json(
      { error: "Missing required query parameter: ticker" },
      { status: 400 }
    );
  }

  if (!config.marketData.baseUrl) {
    logger.error("Market data base URL not configured");
    return NextResponse.json(
      {
        error:
          "MARKET_DATA_BASE_URL is not configured. Set this env var to point to your REST/gRPC gateway.",
        hint: "For development, use the 'Mock' data source in the application UI to avoid this error. See .env.example for configuration details.",
      },
      { status: 500 }
    );
  }

  // Check circuit breaker
  if (!circuitBreaker.canExecute()) {
    logger.warn("Circuit breaker is OPEN, rejecting request", {
      ticker,
      circuitState: circuitBreaker.getState(),
      failureCount: circuitBreaker.getFailureCount(),
    });
    return NextResponse.json(
      {
        error: "Service temporarily unavailable",
        details: "Circuit breaker is OPEN due to repeated failures",
        hint: "The upstream gateway is experiencing issues. Please try again later.",
        circuitState: circuitBreaker.getState(),
      },
      { status: 503 }
    );
  }

  try {
    const upstreamUrl = new URL("/v1/quotes", config.marketData.baseUrl);
    upstreamUrl.searchParams.set("ticker", ticker);
    if (jurisdiction) {
      upstreamUrl.searchParams.set("jurisdiction", jurisdiction);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (config.marketData.apiKey) {
      headers["Authorization"] = `Bearer ${config.marketData.apiKey}`;
    }

    logger.debug("Fetching market data", {
      ticker,
      jurisdiction,
      url: upstreamUrl.toString().replace(config.marketData.apiKey || "", "***"),
    });

    const res = await fetchWithRetry(upstreamUrl.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      let errorBody: any;
      try {
        errorBody = JSON.parse(text);
      } catch {
        errorBody = { message: text };
      }

      logger.warn("Upstream market data request failed", {
        ticker,
        status: res.status,
        error: errorBody,
      });

      return NextResponse.json(
        {
          error: "Upstream market data request failed",
          status: res.status,
          details: errorBody,
        },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const body = (await res.json()) as {
      ticker: string;
      price: number;
      position?: number;
      jurisdiction?: Jurisdiction;
      asOf?: string;
    };

    const payload: AssetData = {
      ticker: body.ticker ?? ticker,
      price: body.price,
      currentPosition: body.position,
      jurisdiction: body.jurisdiction ?? (jurisdiction ?? "Other"),
      lastUpdated: body.asOf ?? new Date().toISOString(),
    };

    logger.debug("Market data fetched successfully", { ticker, price: payload.price });

    return NextResponse.json(payload);
  } catch (error: any) {
    logger.error("Failed to fetch market data", {
      ticker,
      error: error?.message,
      circuitState: circuitBreaker.getState(),
      failureCount: circuitBreaker.getFailureCount(),
    });

    return NextResponse.json(
      {
        error: "Failed to reach upstream market data gateway",
        details: error?.message ?? String(error),
        hint: "For development, use the 'Mock' data source in the application UI",
        circuitState: circuitBreaker.getState(),
      },
      { status: 500 }
    );
  }
}
