"use server";

import { NextResponse } from "next/server";
import type { Jurisdiction } from "@/types";

/**
 * Server-side endpoint for retrieving regulatory configuration
 * from an upstream CRD / rules engine.
 *
 * Expected upstream:
 *   - BASE_URL: process.env.REG_CONFIG_BASE_URL
 *   - GET /v1/regulatory-config?jurisdiction=USA
 *     -> { jurisdiction, rules: [...], version, sourceSystem }
 */

const BASE_URL = process.env.REG_CONFIG_BASE_URL;
const API_KEY = process.env.REG_CONFIG_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jurisdiction = searchParams.get("jurisdiction") as Jurisdiction | null;

  if (!jurisdiction) {
    return NextResponse.json(
      { error: "Missing required query parameter: jurisdiction" },
      { status: 400 }
    );
  }

  if (!BASE_URL) {
    return NextResponse.json(
      {
        error:
          "REG_CONFIG_BASE_URL is not configured. Set this env var to point to your CRD / rules engine gateway.",
        hint: "For development, use the 'Mock' data source in the application UI to avoid this error. See .env.example for configuration details.",
      },
      { status: 500 }
    );
  }

  try {
    const upstreamUrl = new URL("/v1/regulatory-config", BASE_URL);
    upstreamUrl.searchParams.set("jurisdiction", jurisdiction);

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
          error: "Upstream regulatory config request failed",
          status: res.status,
          body: text,
        },
        { status: 502 }
      );
    }

    const body = await res.json();

    return NextResponse.json(body);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to reach upstream regulatory config gateway",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}


