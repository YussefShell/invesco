"use server";

import { NextResponse } from "next/server";
import type { AssetData, Jurisdiction } from "@/types";

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

const BASE_URL = process.env.MARKET_DATA_BASE_URL;
const API_KEY = process.env.MARKET_DATA_API_KEY;

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

  if (!BASE_URL) {
    return NextResponse.json(
      {
        error:
          "MARKET_DATA_BASE_URL is not configured. Set this env var to point to your REST/gRPC gateway.",
        hint: "For development, use the 'Mock' data source in the application UI to avoid this error. See .env.example for configuration details.",
      },
      { status: 500 }
    );
  }

  try {
    const upstreamUrl = new URL("/v1/quotes", BASE_URL);
    upstreamUrl.searchParams.set("ticker", ticker);
    if (jurisdiction) {
      upstreamUrl.searchParams.set("jurisdiction", jurisdiction);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (API_KEY) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    const res = await fetch(upstreamUrl.toString(), {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          error: "Upstream market data request failed",
          status: res.status,
          body: text,
        },
        { status: 502 }
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

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to reach upstream market data gateway",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}


