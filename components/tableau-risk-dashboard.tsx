"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortfolio } from "@/components/PortfolioContext";
import { AlertTriangle, CheckCircle2, XCircle, TrendingUp, Globe, Clock } from "lucide-react";
import type { RegulatoryStatus, Jurisdiction, Holding } from "@/types";

interface RiskMetrics {
  totalHoldings: number;
  activeBreaches: number;
  warnings: number;
  safe: number;
  byJurisdiction: Record<Jurisdiction, { breaches: number; warnings: number; safe: number }>;
  avgTimeToBreach: number | null;
  totalExposure: number;
}

export default function TableauRiskDashboard() {
  const { holdings } = usePortfolio();

  const metrics = useMemo((): RiskMetrics => {
    const result: RiskMetrics = {
      totalHoldings: holdings.length,
      activeBreaches: 0,
      warnings: 0,
      safe: 0,
      byJurisdiction: {
        USA: { breaches: 0, warnings: 0, safe: 0 },
        UK: { breaches: 0, warnings: 0, safe: 0 },
        "Hong Kong": { breaches: 0, warnings: 0, safe: 0 },
        APAC: { breaches: 0, warnings: 0, safe: 0 },
        Other: { breaches: 0, warnings: 0, safe: 0 },
      },
      avgTimeToBreach: null,
      totalExposure: 0,
    };

    let totalTimeToBreach = 0;
    let breachCount = 0;

    holdings.forEach((holding) => {
      const ownershipPercent =
        (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
      result.totalExposure += ownershipPercent;

      // Calculate breach status inline to avoid hook violations
      const threshold = holding.regulatoryRule.threshold;
      const warningMin = threshold * 0.9; // 90% of threshold
      const warningMax = threshold * 0.99; // 99% of threshold
      
      let status: RegulatoryStatus = "safe";
      let projectedBreachTime: number | null = null;
      
      if (ownershipPercent >= threshold) {
        status = "breach";
      } else if (ownershipPercent >= warningMin && ownershipPercent < threshold) {
        status = "warning";
        // Calculate time to breach based on buying velocity
        if (holding.buyingVelocity > 0) {
          const sharesToBreach = (threshold / 100) * holding.totalSharesOutstanding - holding.sharesOwned;
          const hoursToBreach = sharesToBreach / holding.buyingVelocity;
          projectedBreachTime = hoursToBreach;
        }
      }
      
      const breach = {
        status,
        projectedBreachTime,
        timeToBreach: status === "breach" 
          ? "Active Breach" 
          : status === "warning" && projectedBreachTime !== null
          ? `Breach in ${projectedBreachTime < 24 ? `${projectedBreachTime.toFixed(1)}h` : `${(projectedBreachTime / 24).toFixed(1)}d`}`
          : "Safe"
      };
      
      if (!breach) return;

      const jurisdiction = holding.jurisdiction;

      if (status === "breach") {
        result.activeBreaches++;
        result.byJurisdiction[jurisdiction].breaches++;
      } else if (status === "warning") {
        result.warnings++;
        result.byJurisdiction[jurisdiction].warnings++;
        if (breach.projectedBreachTime !== null) {
          totalTimeToBreach += breach.projectedBreachTime;
          breachCount++;
        }
      } else {
        result.safe++;
        result.byJurisdiction[jurisdiction].safe++;
      }
    });

    result.avgTimeToBreach =
      breachCount > 0 ? totalTimeToBreach / breachCount : null;

    return result;
  }, [holdings]);

  const getStatusColor = (status: RegulatoryStatus) => {
    switch (status) {
      case "breach":
        return "bg-red-500";
      case "warning":
        return "bg-orange-500";
      case "safe":
        return "bg-green-500";
    }
  };

  const jurisdictionData = Object.entries(metrics.byJurisdiction)
    .filter(([jurisdiction]) => {
      const data = metrics.byJurisdiction[jurisdiction as Jurisdiction];
      return data.breaches + data.warnings + data.safe > 0;
    })
    .map(([jurisdiction, data]) => ({
      jurisdiction: jurisdiction as Jurisdiction,
      ...data,
      total: data.breaches + data.warnings + data.safe,
    }));

  return (
    <div className="space-y-4">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalHoldings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active positions monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Active Breaches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {metrics.activeBreaches}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Require immediate action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {metrics.warnings}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Approaching thresholds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Safe Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {metrics.safe}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Within compliance limits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Distribution by Jurisdiction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Risk Distribution by Jurisdiction
            </CardTitle>
            <CardDescription>
              Breakdown of compliance status across regulatory regions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jurisdictionData.map(({ jurisdiction, breaches, warnings, safe, total }) => {
                const breachPercent = (breaches / total) * 100;
                const warningPercent = (warnings / total) * 100;
                const safePercent = (safe / total) * 100;

                return (
                  <div key={jurisdiction} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{jurisdiction}</span>
                      <span className="text-xs text-muted-foreground">
                        {total} holdings
                      </span>
                    </div>
                    <div className="h-6 bg-muted rounded-full overflow-hidden flex">
                      {breaches > 0 && (
                        <div
                          className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${breachPercent}%` }}
                          title={`${breaches} breaches`}
                        >
                          {breaches > 0 && breaches}
                        </div>
                      )}
                      {warnings > 0 && (
                        <div
                          className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${warningPercent}%` }}
                          title={`${warnings} warnings`}
                        >
                          {warnings > 0 && warnings}
                        </div>
                      )}
                      {safe > 0 && (
                        <div
                          className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${safePercent}%` }}
                          title={`${safe} safe`}
                        >
                          {safe > 0 && safe}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-muted-foreground">
                          {breaches} Breach{breaches !== 1 ? "es" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-muted-foreground">
                          {warnings} Warning{warnings !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-muted-foreground">
                          {safe} Safe
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Risk Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Risk Status Overview
            </CardTitle>
            <CardDescription>
              Visual breakdown of portfolio compliance status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Pie Chart Representation */}
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="20"
                      className="text-muted"
                    />
                    {metrics.activeBreaches > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="20"
                        className="text-red-500"
                        strokeDasharray={`${
                          (metrics.activeBreaches / metrics.totalHoldings) * 251.2
                        } 251.2`}
                        strokeDashoffset="0"
                      />
                    )}
                    {metrics.warnings > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="20"
                        className="text-orange-500"
                        strokeDasharray={`${
                          (metrics.warnings / metrics.totalHoldings) * 251.2
                        } 251.2`}
                        strokeDashoffset={`-${
                          (metrics.activeBreaches / metrics.totalHoldings) * 251.2
                        }`}
                      />
                    )}
                    {metrics.safe > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="20"
                        className="text-green-500"
                        strokeDasharray={`${
                          (metrics.safe / metrics.totalHoldings) * 251.2
                        } 251.2`}
                        strokeDashoffset={`-${
                          ((metrics.activeBreaches + metrics.warnings) /
                            metrics.totalHoldings) *
                          251.2
                        }`}
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {metrics.totalHoldings}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total Holdings
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-red-500/10">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">Active Breaches</span>
                  </div>
                  <span className="text-sm font-bold text-red-500">
                    {metrics.activeBreaches}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-orange-500/10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">Warnings</span>
                  </div>
                  <span className="text-sm font-bold text-orange-500">
                    {metrics.warnings}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-green-500/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Safe</span>
                  </div>
                  <span className="text-sm font-bold text-green-500">
                    {metrics.safe}
                  </span>
                </div>
              </div>

              {/* Average Time to Breach */}
              {metrics.avgTimeToBreach !== null && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Avg. Time to Breach:
                    </span>
                    <span className="font-semibold">
                      {metrics.avgTimeToBreach < 24
                        ? `${metrics.avgTimeToBreach.toFixed(1)} hours`
                        : `${(metrics.avgTimeToBreach / 24).toFixed(1)} days`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Risk Positions */}
      <TopRiskPositions holdings={holdings} />
    </div>
  );
}

function TopRiskPositions({ holdings }: { holdings: Holding[] }) {
  const riskPositions = useMemo(() => {
    return holdings
      .map((holding) => {
        const ownershipPercent =
          (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
        const threshold = holding.regulatoryRule.threshold;
        const warningMin = threshold * 0.9;
        
        let status: RegulatoryStatus = "safe";
        let projectedBreachTime: number | null = null;
        
        if (ownershipPercent >= threshold) {
          status = "breach";
        } else if (ownershipPercent >= warningMin && ownershipPercent < threshold) {
          status = "warning";
          if (holding.buyingVelocity > 0) {
            const sharesToBreach = (threshold / 100) * holding.totalSharesOutstanding - holding.sharesOwned;
            const hoursToBreach = sharesToBreach / holding.buyingVelocity;
            projectedBreachTime = hoursToBreach;
          }
        }
        
        const breach = {
          status,
          projectedBreachTime,
          timeToBreach: status === "breach" 
            ? "Active Breach" 
            : status === "warning" && projectedBreachTime !== null
            ? `Breach in ${projectedBreachTime < 24 ? `${projectedBreachTime.toFixed(1)}h` : `${(projectedBreachTime / 24).toFixed(1)}d`}`
            : "Safe"
        };
        
        // Calculate compliance info inline
        const compliance = {
          status: status === "breach" ? "BREACH" : status === "warning" ? "WARNING" : "SAFE",
          requiredForm: holding.regulatoryRule.name,
          deadline: "N/A",
          deadlineDays: null as number | null,
        };
        
        return {
          holding,
          ownershipPercent,
          breach,
          compliance,
        };
      })
      .filter((item) => item.breach && item.breach.status !== "safe")
      .sort((a, b) => {
        if (a.breach!.status === "breach" && b.breach!.status !== "breach")
          return -1;
        if (a.breach!.status !== "breach" && b.breach!.status === "breach")
          return 1;
        return (
          (b.breach?.projectedBreachTime || Infinity) -
          (a.breach?.projectedBreachTime || Infinity)
        );
      })
      .slice(0, 5);
  }, [holdings]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Risk Positions</CardTitle>
        <CardDescription>
          Holdings requiring immediate attention or monitoring
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {riskPositions.map(({ holding, ownershipPercent, breach, compliance }) => (
                <div
                  key={holding.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{holding.ticker}</span>
                      <Badge
                        variant={
                          breach?.status === "breach"
                            ? "destructive"
                            : breach?.status === "warning"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {breach?.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {holding.jurisdiction}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {holding.issuer} • {ownershipPercent.toFixed(2)}% ownership
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {breach?.timeToBreach || "Safe"}
                    </div>
                    {compliance && (
                      <div className="text-xs text-muted-foreground">
                        {compliance.requiredForm}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          {riskPositions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>All positions are within compliance limits</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

