"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { usePortfolio } from "@/components/PortfolioContext";
import { useRiskCalculator } from "@/lib/use-risk-calculator";
import { historicalDataStore } from "@/lib/historical-data-store";
import type { Holding, Jurisdiction, BreachEvent } from "@/types";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Clock,
} from "lucide-react";

interface AnalyticsMetrics {
  totalHoldings: number;
  totalBreaches: number;
  totalWarnings: number;
  totalSafe: number;
  avgOwnershipPercent: number;
  avgBuyingVelocity: number;
  totalMarketValue: number;
  breachRate: number;
  warningRate: number;
  byJurisdiction: Record<Jurisdiction, {
    holdings: number;
    breaches: number;
    warnings: number;
    safe: number;
    avgOwnership: number;
  }>;
  recentBreachEvents: number;
  avgTimeToBreach: number | null;
  topRiskHoldings: Array<{
    ticker: string;
    ownershipPercent: number;
    buyingVelocity: number;
    timeToBreach: string | null;
  }>;
}

export default function AdvancedAnalyticsDashboard() {
  const { holdings } = usePortfolio();
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<Jurisdiction | "all">("all");

  const metrics = useMemo(() => {
    const now = new Date();
    let startTime: string | undefined;
    
    if (timeRange === "24h") {
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    } else if (timeRange === "7d") {
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (timeRange === "30d") {
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const breachEvents = historicalDataStore.queryBreachEvents({
      startTime,
      limit: 1000,
    });

    // Calculate risk status for each holding
    const holdingsWithStatus = holdings.map((holding) => {
      const ownershipPercent = (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
      const threshold = holding.regulatoryRule.threshold;
      const warningMin = threshold * 0.9;
      
      let status: "breach" | "warning" | "safe" = "safe";
      if (ownershipPercent >= threshold) {
        status = "breach";
      } else if (ownershipPercent >= warningMin && ownershipPercent < threshold) {
        status = "warning";
      }

      // Calculate time to breach
      const remainingToThreshold = threshold - ownershipPercent;
      const sharesToBreach = (remainingToThreshold / 100) * (holding.totalSharesOutstanding / 100);
      const timeToBreach = holding.buyingVelocity > 0 
        ? sharesToBreach / holding.buyingVelocity 
        : null;

      return {
        ...holding,
        ownershipPercent,
        status,
        timeToBreach,
      };
    });

    // Filter by jurisdiction if selected
    const filteredHoldings = selectedJurisdiction === "all"
      ? holdingsWithStatus
      : holdingsWithStatus.filter((h) => h.jurisdiction === selectedJurisdiction);

    const totalHoldings = filteredHoldings.length;
    const totalBreaches = filteredHoldings.filter((h) => h.status === "breach").length;
    const totalWarnings = filteredHoldings.filter((h) => h.status === "warning").length;
    const totalSafe = filteredHoldings.filter((h) => h.status === "safe").length;

    const avgOwnershipPercent = filteredHoldings.length > 0
      ? filteredHoldings.reduce((sum, h) => sum + h.ownershipPercent, 0) / filteredHoldings.length
      : 0;

    const avgBuyingVelocity = filteredHoldings.length > 0
      ? filteredHoldings.reduce((sum, h) => sum + h.buyingVelocity, 0) / filteredHoldings.length
      : 0;

    const totalMarketValue = filteredHoldings.reduce((sum, h) => {
      const value = (h.price || 0) * h.sharesOwned;
      return sum + value;
    }, 0);

    const breachRate = totalHoldings > 0 ? (totalBreaches / totalHoldings) * 100 : 0;
    const warningRate = totalHoldings > 0 ? (totalWarnings / totalHoldings) * 100 : 0;

    // Group by jurisdiction
    const byJurisdiction: Record<Jurisdiction, {
      holdings: number;
      breaches: number;
      warnings: number;
      safe: number;
      avgOwnership: number;
    }> = {
      USA: { holdings: 0, breaches: 0, warnings: 0, safe: 0, avgOwnership: 0 },
      UK: { holdings: 0, breaches: 0, warnings: 0, safe: 0, avgOwnership: 0 },
      "Hong Kong": { holdings: 0, breaches: 0, warnings: 0, safe: 0, avgOwnership: 0 },
      APAC: { holdings: 0, breaches: 0, warnings: 0, safe: 0, avgOwnership: 0 },
      Other: { holdings: 0, breaches: 0, warnings: 0, safe: 0, avgOwnership: 0 },
    };

    filteredHoldings.forEach((holding) => {
      const jur = holding.jurisdiction;
      if (byJurisdiction[jur]) {
        byJurisdiction[jur].holdings++;
        // Map status to property name (breach -> breaches, warning -> warnings, safe -> safe)
        const statusKey = holding.status === "breach" ? "breaches" : holding.status === "warning" ? "warnings" : "safe";
        byJurisdiction[jur][statusKey]++;
        byJurisdiction[jur].avgOwnership += holding.ownershipPercent;
      }
    });

    Object.keys(byJurisdiction).forEach((jur) => {
      const j = jur as Jurisdiction;
      if (byJurisdiction[j].holdings > 0) {
        byJurisdiction[j].avgOwnership /= byJurisdiction[j].holdings;
      }
    });

    // Recent breach events
    const recentBreachEvents = breachEvents.filter(
      (e) => e.eventType === "BREACH_DETECTED" || e.eventType === "WARNING_DETECTED"
    ).length;

    // Average time to breach (for warnings only)
    const warningsWithTime = filteredHoldings.filter(
      (h) => h.status === "warning" && h.timeToBreach !== null
    );
    const avgTimeToBreach = warningsWithTime.length > 0
      ? warningsWithTime.reduce((sum, h) => sum + (h.timeToBreach || 0), 0) / warningsWithTime.length
      : null;

    // Top risk holdings
    const topRiskHoldings = filteredHoldings
      .filter((h) => h.status === "breach" || h.status === "warning")
      .sort((a, b) => {
        // Sort by status first (breach > warning), then by ownership %
        if (a.status !== b.status) {
          return a.status === "breach" ? -1 : 1;
        }
        return b.ownershipPercent - a.ownershipPercent;
      })
      .slice(0, 5)
      .map((h) => ({
        ticker: h.ticker,
        ownershipPercent: h.ownershipPercent,
        buyingVelocity: h.buyingVelocity,
        timeToBreach: h.timeToBreach ? `${h.timeToBreach.toFixed(1)}h` : null,
      }));

    return {
      totalHoldings,
      totalBreaches,
      totalWarnings,
      totalSafe,
      avgOwnershipPercent,
      avgBuyingVelocity,
      totalMarketValue,
      breachRate,
      warningRate,
      byJurisdiction,
      recentBreachEvents,
      avgTimeToBreach,
      topRiskHoldings,
    } as AnalyticsMetrics;
  }, [holdings, timeRange, selectedJurisdiction]);

  const jurisdictions: Jurisdiction[] = ["USA", "UK", "Hong Kong", "APAC", "Other"];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Advanced Analytics Dashboard
            </CardTitle>
            <CardDescription>
              Comprehensive risk metrics and performance indicators
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Time Range</Label>
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7d</SelectItem>
                  <SelectItem value="30d">Last 30d</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Jurisdiction</Label>
              <Select
                value={selectedJurisdiction}
                onValueChange={(v) => setSelectedJurisdiction(v as Jurisdiction | "all")}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {jurisdictions.map((jur) => (
                    <SelectItem key={jur} value={jur}>
                      {jur}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Holdings"
            value={metrics.totalHoldings}
            icon={<Activity className="w-4 h-4" />}
            trend={null}
          />
          <MetricCard
            title="Active Breaches"
            value={metrics.totalBreaches}
            icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
            trend={metrics.breachRate > 5 ? "up" : "down"}
            subtitle={`${metrics.breachRate.toFixed(1)}% of holdings`}
            variant="danger"
          />
          <MetricCard
            title="Warnings"
            value={metrics.totalWarnings}
            icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
            trend={metrics.warningRate > 10 ? "up" : "down"}
            subtitle={`${metrics.warningRate.toFixed(1)}% of holdings`}
            variant="warning"
          />
          <MetricCard
            title="Safe Positions"
            value={metrics.totalSafe}
            icon={<Target className="w-4 h-4 text-green-500" />}
            trend={null}
            subtitle={`${((metrics.totalSafe / metrics.totalHoldings) * 100).toFixed(1)}%`}
            variant="success"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Avg Ownership %"
            value={`${metrics.avgOwnershipPercent.toFixed(2)}%`}
            icon={<Target className="w-4 h-4" />}
            trend={null}
          />
          <MetricCard
            title="Avg Buying Velocity"
            value={`${metrics.avgBuyingVelocity.toLocaleString()}`}
            icon={<TrendingUp className="w-4 h-4" />}
            trend={null}
            subtitle="shares/hr"
          />
          <MetricCard
            title="Recent Events"
            value={metrics.recentBreachEvents}
            icon={<Clock className="w-4 h-4" />}
            trend={null}
            subtitle={`in ${timeRange}`}
          />
        </div>

        {/* Jurisdiction Breakdown */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Breakdown by Jurisdiction</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {jurisdictions.map((jur) => {
              const data = metrics.byJurisdiction[jur];
              if (data.holdings === 0) return null;
              
              return (
                <Card key={jur} className="p-3">
                  <div className="text-xs font-semibold mb-2">{jur}</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Holdings:</span>
                      <span className="font-medium">{data.holdings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Breaches:</span>
                      <span className="font-medium text-red-500">{data.breaches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Warnings:</span>
                      <span className="font-medium text-orange-500">{data.warnings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Ownership:</span>
                      <span className="font-medium">{data.avgOwnership.toFixed(2)}%</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Top Risk Holdings */}
        {metrics.topRiskHoldings.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Top Risk Holdings</h3>
            <div className="space-y-2">
              {metrics.topRiskHoldings.map((holding, index) => (
                <div
                  key={holding.ticker}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-mono font-semibold text-sm">{holding.ticker}</div>
                      <div className="text-xs text-muted-foreground">
                        {holding.ownershipPercent.toFixed(2)}% ownership
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <div className="text-muted-foreground">Velocity</div>
                      <div className="font-medium">{holding.buyingVelocity.toLocaleString()}/hr</div>
                    </div>
                    {holding.timeToBreach && (
                      <div>
                        <div className="text-muted-foreground">Time to Breach</div>
                        <div className="font-medium text-orange-500">{holding.timeToBreach}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Risk Distribution Chart */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-4">Risk Distribution</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Breaches</span>
                  <span>{metrics.totalBreaches}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${metrics.totalHoldings > 0 ? (metrics.totalBreaches / metrics.totalHoldings) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Warnings</span>
                  <span>{metrics.totalWarnings}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${metrics.totalHoldings > 0 ? (metrics.totalWarnings / metrics.totalHoldings) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Safe</span>
                  <span>{metrics.totalSafe}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${metrics.totalHoldings > 0 ? (metrics.totalSafe / metrics.totalHoldings) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Jurisdiction Risk Chart */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-4">Risk by Jurisdiction</h3>
            <div className="space-y-2">
              {jurisdictions.map((jur) => {
                const data = metrics.byJurisdiction[jur];
                if (data.holdings === 0) return null;
                const riskRate = data.holdings > 0
                  ? ((data.breaches + data.warnings) / data.holdings) * 100
                  : 0;
                
                return (
                  <div key={jur}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{jur}</span>
                      <span>{riskRate.toFixed(1)}% risk</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${riskRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: "up" | "down" | null;
  subtitle?: string;
  variant?: "default" | "danger" | "warning" | "success";
}

function MetricCard({ title, value, icon, trend, subtitle, variant = "default" }: MetricCardProps) {
  const variantStyles = {
    default: "border-border",
    danger: "border-red-500/40 bg-red-500/5",
    warning: "border-orange-500/40 bg-orange-500/5",
    success: "border-green-500/40 bg-green-500/5",
  };

  return (
    <Card className={`p-4 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs font-medium text-muted-foreground">{title}</div>
        <div className={variant === "danger" ? "text-red-500" : variant === "warning" ? "text-orange-500" : variant === "success" ? "text-green-500" : ""}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend === "up" ? (
            <TrendingUp className="w-3 h-3 text-red-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-green-500" />
          )}
          <span className="text-xs text-muted-foreground">
            {trend === "up" ? "Increasing" : "Decreasing"}
          </span>
        </div>
      )}
    </Card>
  );
}

