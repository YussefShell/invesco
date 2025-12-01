/**
 * Tableau Data API Endpoint
 * 
 * This endpoint provides portfolio data in formats that Tableau can consume.
 * Supports both JSON and CSV formats for different Tableau connection methods.
 * 
 * Usage:
 * - GET /api/tableau/data?format=json - Returns JSON data
 * - GET /api/tableau/data?format=csv - Returns CSV data
 * - GET /api/tableau/data?format=json&jurisdiction=USA - Filter by jurisdiction
 */

import { NextResponse } from "next/server";
import { mockPositions, regulatoryRules, getRealisticSharesOutstanding } from "@/lib/mock-data";
import { getMarketDataGenerator } from "@/lib/market-data-generator";
import type { Holding, Jurisdiction } from "@/types";

/**
 * Get current holdings data
 * This generates fresh data from mock positions and market data generator
 * In production, this would fetch from a database or real-time data source
 */
function getCurrentHoldings(): Holding[] {
  const generator = getMarketDataGenerator();
  
  return mockPositions.map((pos) => {
    const assetData = generator.generatePriceUpdate(pos.ticker || "");
    
    // Use realistic shares outstanding from mock-data
    const totalSharesOutstanding = getRealisticSharesOutstanding(pos.ticker || "");
    
    // Calculate shares owned from current position percentage
    const sharesOwned = (pos.currentPosition / 100) * totalSharesOutstanding;
    
    return {
      id: pos.id,
      ticker: pos.ticker || "",
      issuer: pos.issuer,
      isin: pos.isin,
      jurisdiction: pos.jurisdiction,
      sharesOwned,
      totalSharesOutstanding,
      buyingVelocity: pos.buyingVelocity,
      regulatoryRule: pos.regulatoryRule,
      lastUpdated: new Date().toISOString(),
      price: assetData?.price,
    };
  });
}

/**
 * Calculate ownership percentage and breach status
 */
function calculateMetrics(holding: Holding) {
  const ownershipPercent = (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
  const threshold = holding.regulatoryRule.threshold;
  const warningMin = threshold * 0.9;
  
  let status: "breach" | "warning" | "safe" = "safe";
  if (ownershipPercent >= threshold) {
    status = "breach";
  } else if (ownershipPercent >= warningMin) {
    status = "warning";
  }
  
  let projectedBreachTime: number | null = null;
  if (status === "warning" && holding.buyingVelocity > 0) {
    const thresholdShares = (threshold / 100) * holding.totalSharesOutstanding;
    const sharesToBreach = thresholdShares - holding.sharesOwned;
    projectedBreachTime = sharesToBreach / holding.buyingVelocity; // hours
  }
  
  return {
    ownershipPercent,
    status,
    projectedBreachTime,
    threshold,
    warningMin,
  };
}

/**
 * Convert holdings to Tableau-friendly JSON format
 */
function toTableauJSON(holdings: Holding[], jurisdiction?: Jurisdiction) {
  const filtered = jurisdiction 
    ? holdings.filter(h => h.jurisdiction === jurisdiction)
    : holdings;
  
  return filtered.map((holding) => {
    const metrics = calculateMetrics(holding);
    
    return {
      // Identifiers
      id: holding.id,
      ticker: holding.ticker,
      issuer: holding.issuer,
      isin: holding.isin,
      
      // Location
      jurisdiction: holding.jurisdiction,
      
      // Position Data
      sharesOwned: holding.sharesOwned,
      totalSharesOutstanding: holding.totalSharesOutstanding,
      ownershipPercent: metrics.ownershipPercent,
      price: holding.price || null,
      
      // Regulatory
      regulatoryRuleCode: holding.regulatoryRule.code,
      regulatoryRuleName: holding.regulatoryRule.name,
      threshold: metrics.threshold,
      warningMin: metrics.warningMin,
      
      // Risk Status
      status: metrics.status,
      isBreach: metrics.status === "breach",
      isWarning: metrics.status === "warning",
      isSafe: metrics.status === "safe",
      
      // Velocity & Projections
      buyingVelocity: holding.buyingVelocity,
      projectedBreachTimeHours: metrics.projectedBreachTime,
      projectedBreachTimeDays: metrics.projectedBreachTime 
        ? (metrics.projectedBreachTime / 24).toFixed(2) 
        : null,
      
      // Timestamps
      lastUpdated: holding.lastUpdated,
      timestamp: new Date().toISOString(),
    };
  });
}

/**
 * Convert holdings to CSV format
 */
function toTableauCSV(holdings: Holding[], jurisdiction?: Jurisdiction) {
  const filtered = jurisdiction 
    ? holdings.filter(h => h.jurisdiction === jurisdiction)
    : holdings;
  
  const headers = [
    "id",
    "ticker",
    "issuer",
    "isin",
    "jurisdiction",
    "sharesOwned",
    "totalSharesOutstanding",
    "ownershipPercent",
    "price",
    "regulatoryRuleCode",
    "regulatoryRuleName",
    "threshold",
    "warningMin",
    "status",
    "isBreach",
    "isWarning",
    "isSafe",
    "buyingVelocity",
    "projectedBreachTimeHours",
    "projectedBreachTimeDays",
    "lastUpdated",
    "timestamp",
  ];
  
  const rows = filtered.map((holding) => {
    const metrics = calculateMetrics(holding);
    
    return [
      holding.id,
      holding.ticker,
      holding.issuer,
      holding.isin,
      holding.jurisdiction,
      holding.sharesOwned,
      holding.totalSharesOutstanding,
      metrics.ownershipPercent.toFixed(3),
      holding.price?.toFixed(2) || "",
      holding.regulatoryRule.code,
      holding.regulatoryRule.name,
      metrics.threshold,
      metrics.warningMin,
      metrics.status,
      metrics.status === "breach" ? "1" : "0",
      metrics.status === "warning" ? "1" : "0",
      metrics.status === "safe" ? "1" : "0",
      holding.buyingVelocity,
      metrics.projectedBreachTime?.toFixed(2) || "",
      metrics.projectedBreachTime 
        ? (metrics.projectedBreachTime / 24).toFixed(2) 
        : "",
      holding.lastUpdated,
      new Date().toISOString(),
    ].map(val => {
      // Escape CSV values
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
  });
  
  return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const jurisdiction = searchParams.get("jurisdiction") as Jurisdiction | null;
    
    const holdings = getCurrentHoldings();
    
    if (format === "csv") {
      const csv = toTableauCSV(holdings, jurisdiction || undefined);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=portfolio-data.csv",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }
    
    // Default to JSON
    const json = toTableauJSON(holdings, jurisdiction || undefined);
    
    return NextResponse.json({
      data: json,
      metadata: {
        totalRecords: json.length,
        jurisdiction: jurisdiction || "all",
        timestamp: new Date().toISOString(),
        format: "json",
      },
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("[tableau-data] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate Tableau data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

