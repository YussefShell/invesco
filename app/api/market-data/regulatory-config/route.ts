"use server";

import { NextResponse } from "next/server";
import type { Jurisdiction } from "@/types";
import { getDataAdapterConfig } from "@/lib/config/data-adapters";
import { CircuitBreaker } from "@/lib/utils/circuit-breaker";
import { Logger } from "@/lib/utils/logger";

const logger = new Logger("RegulatoryConfigAPI");
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
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        options,
        config.regulatoryConfig.timeout
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
 * Server-side endpoint for retrieving regulatory configuration
 * from an upstream CRD / rules engine.
 *
 * Expected upstream:
 *   - BASE_URL: process.env.REG_CONFIG_BASE_URL
 *   - GET /v1/regulatory-config?jurisdiction=USA
 *     -> { jurisdiction, rules: [...], version, sourceSystem }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jurisdiction = searchParams.get("jurisdiction") as Jurisdiction | null;

  if (!jurisdiction) {
    return NextResponse.json(
      { error: "Missing required query parameter: jurisdiction" },
      { status: 400 }
    );
  }

  if (!config.regulatoryConfig.baseUrl) {
    logger.error("Regulatory config base URL not configured");
    return NextResponse.json(
      {
        error:
          "REG_CONFIG_BASE_URL is not configured. Set this env var to point to your CRD / rules engine gateway.",
        hint: "For development, use the 'Mock' data source in the application UI to avoid this error. See .env.example for configuration details.",
      },
      { status: 500 }
    );
  }

  // Check circuit breaker
  if (!circuitBreaker.canExecute()) {
    logger.warn("Circuit breaker is OPEN, rejecting request", {
      jurisdiction,
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
    const upstreamUrl = new URL(
      "/v1/regulatory-config",
      config.regulatoryConfig.baseUrl
    );
    upstreamUrl.searchParams.set("jurisdiction", jurisdiction);

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (config.regulatoryConfig.apiKey) {
      headers["Authorization"] = `Bearer ${config.regulatoryConfig.apiKey}`;
    }

    logger.debug("Fetching regulatory config", {
      jurisdiction,
      url: upstreamUrl.toString().replace(
        config.regulatoryConfig.apiKey || "",
        "***"
      ),
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

      logger.warn("Upstream regulatory config request failed", {
        jurisdiction,
        status: res.status,
        error: errorBody,
      });

      return NextResponse.json(
        {
          error: "Upstream regulatory config request failed",
          status: res.status,
          details: errorBody,
        },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const body = await res.json();

    logger.debug("Regulatory config fetched successfully", { jurisdiction });

    return NextResponse.json(body);
  } catch (error: any) {
    logger.error("Failed to fetch regulatory config", {
      jurisdiction,
      error: error?.message,
      circuitState: circuitBreaker.getState(),
      failureCount: circuitBreaker.getFailureCount(),
    });

    return NextResponse.json(
      {
        error: "Failed to reach upstream regulatory config gateway",
        details: error?.message ?? String(error),
        hint: "For development, use the 'Mock' data source in the application UI",
        circuitState: circuitBreaker.getState(),
      },
      { status: 500 }
    );
  }
}
