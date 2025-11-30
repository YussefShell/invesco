"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { historicalDataStore } from "@/lib/historical-data-store";
import type { TrendDataPoint, Jurisdiction } from "@/types";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

export default function TrendAnalysisViewer() {
  const [timeRange, setTimeRange] = useState<string>("24h");
  // Force refresh state to trigger re-query of trend data
  const [refreshKey, setRefreshKey] = useState(0);

  // Poll for new trend data points periodically to keep the view up-to-date
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 10000); // Refresh every 10 seconds (trend data is collected every 5 minutes, so this is sufficient)

    return () => clearInterval(interval);
  }, []);

  const trendAnalysis = useMemo(() => {
    const now = new Date();
    let startTime: string;
    
    if (timeRange === "1h") {
      startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    } else if (timeRange === "24h") {
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    } else if (timeRange === "7d") {
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (timeRange === "30d") {
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }

    return historicalDataStore.getTrendAnalysis(startTime, now.toISOString());
  }, [timeRange, refreshKey]);

  const getTrendIcon = (trend: "increasing" | "decreasing" | "stable") => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case "decreasing":
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      case "stable":
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendBadge = (trend: "increasing" | "decreasing" | "stable") => {
    switch (trend) {
      case "increasing":
        return <Badge variant="danger" className="text-xs">Increasing</Badge>;
      case "decreasing":
        return <Badge variant="success" className="text-xs">Decreasing</Badge>;
      case "stable":
        return <Badge variant="outline" className="text-xs">Stable</Badge>;
    }
  };

  const latestPoint = trendAnalysis.dataPoints[trendAnalysis.dataPoints.length - 1];
  const firstPoint = trendAnalysis.dataPoints[0];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Trend Analysis
        </CardTitle>
        <CardDescription>
          Analyze trends in breaches, warnings, and ownership over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time Range Selector */}
        <div className="flex items-center gap-4">
          <Label htmlFor="trend-time-range" className="text-sm">Time Range:</Label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger id="trend-time-range" className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trend Summary */}
        {trendAnalysis.dataPoints.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Breach Trend */}
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Breach Trend</span>
                  {getTrendIcon(trendAnalysis.breachTrend)}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {getTrendBadge(trendAnalysis.breachTrend)}
                </div>
                {firstPoint && latestPoint && (
                  <div className="text-xs text-muted-foreground">
                    {firstPoint.totalBreaches} → {latestPoint.totalBreaches} breaches
                  </div>
                )}
              </div>

              {/* Warning Trend */}
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Warning Trend</span>
                  {getTrendIcon(trendAnalysis.warningTrend)}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {getTrendBadge(trendAnalysis.warningTrend)}
                </div>
                {firstPoint && latestPoint && (
                  <div className="text-xs text-muted-foreground">
                    {firstPoint.totalWarnings} → {latestPoint.totalWarnings} warnings
                  </div>
                )}
              </div>

              {/* Average Ownership Change */}
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Avg Ownership Change</span>
                  {trendAnalysis.avgOwnershipChange > 0 ? (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  ) : trendAnalysis.avgOwnershipChange < 0 ? (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  ) : (
                    <Minus className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="text-2xl font-bold">
                  {trendAnalysis.avgOwnershipChange > 0 ? "+" : ""}
                  {trendAnalysis.avgOwnershipChange.toFixed(3)}%
                </div>
                <div className="text-xs text-muted-foreground">per data point</div>
              </div>

              {/* Average Velocity Change */}
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Avg Velocity Change</span>
                  {trendAnalysis.avgVelocityChange > 0 ? (
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                  ) : trendAnalysis.avgVelocityChange < 0 ? (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  ) : (
                    <Minus className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="text-2xl font-bold">
                  {trendAnalysis.avgVelocityChange > 0 ? "+" : ""}
                  {trendAnalysis.avgVelocityChange.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">shares/hr per data point</div>
              </div>
            </div>

            {/* Current Metrics */}
            {latestPoint && (
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="text-sm font-semibold mb-3">Current Metrics</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Breaches</div>
                    <div className="text-lg font-bold text-red-500">{latestPoint.totalBreaches}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Warnings</div>
                    <div className="text-lg font-bold text-orange-500">{latestPoint.totalWarnings}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Safe</div>
                    <div className="text-lg font-bold text-green-500">{latestPoint.totalSafe}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Avg Ownership</div>
                    <div className="text-lg font-bold">{latestPoint.avgOwnershipPercent.toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Jurisdiction Breakdown */}
            {latestPoint && (
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="text-sm font-semibold mb-3">By Jurisdiction</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(Object.keys(latestPoint.byJurisdiction) as Jurisdiction[]).map((jurisdiction) => {
                    const data = latestPoint.byJurisdiction[jurisdiction];
                    const total = data.breaches + data.warnings + data.safe;
                    if (total === 0) return null;

                    return (
                      <div key={jurisdiction} className="p-3 rounded border border-border bg-background">
                        <div className="text-xs font-semibold mb-2">{jurisdiction}</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Breaches:</span>
                            <span className="font-semibold text-red-500">{data.breaches}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Warnings:</span>
                            <span className="font-semibold text-orange-500">{data.warnings}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Safe:</span>
                            <span className="font-semibold text-green-500">{data.safe}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data Points Count */}
            <div className="text-xs text-muted-foreground text-center">
              Analyzing {trendAnalysis.dataPoints.length} data point{trendAnalysis.dataPoints.length !== 1 ? "s" : ""}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground space-y-2">
            <div className="text-sm font-medium">No trend data available for the selected time range</div>
            <div className="text-xs">
              Trend data is automatically collected every 5 minutes.
              <br />
              Please wait a few minutes for data to accumulate, or select a longer time range.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

