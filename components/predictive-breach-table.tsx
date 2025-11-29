"use client";

import { useMemo, useState, useEffect } from "react";
import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePortfolio } from "@/components/PortfolioContext";
import { useRiskCalculator } from "@/lib/use-risk-calculator";
import type { Holding } from "@/types";
import { AlertTriangle, CheckCircle2, XCircle, Filter, X } from "lucide-react";
import { calculateBusinessDeadline } from "@/lib/compliance-rules-engine";
import { useAuditLog } from "@/components/AuditLogContext";
import { historicalDataStore } from "@/lib/historical-data-store";

interface PredictiveBreachTableProps {
  onRowClick: (ticker: string) => void;
}

type RiskStatusFilter = "all" | "breach" | "warning" | "safe";
type VelocityFilter = "all" | "high" | "medium" | "low";
type DataFreshnessFilter = "all" | "fresh" | "stale" | "error";

interface FilterState {
  jurisdiction: string | null;
  riskStatus: RiskStatusFilter;
  velocity: VelocityFilter;
  dataFreshness: DataFreshnessFilter;
}

export default function PredictiveBreachTable({
  onRowClick,
}: PredictiveBreachTableProps) {
  const { holdings } = usePortfolio();
  const [filters, setFilters] = useState<FilterState>({
    jurisdiction: null,
    riskStatus: "all",
    velocity: "all",
    dataFreshness: "all",
  });
  const [showFilters, setShowFilters] = useState(true);

  const filteredHoldings = useMemo(() => {
    return holdings.filter((holding) => {
      // Jurisdiction filter
      if (filters.jurisdiction && holding.jurisdiction !== filters.jurisdiction) {
        return false;
      }

      // Risk status filter (need to calculate for each holding)
      if (filters.riskStatus !== "all") {
        const ownershipPercent = (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
        const threshold = holding.regulatoryRule.threshold;
        const warningMin = threshold * 0.9;
        
        let status: "breach" | "warning" | "safe" = "safe";
        if (ownershipPercent >= threshold) {
          status = "breach";
        } else if (ownershipPercent >= warningMin && ownershipPercent < threshold) {
          status = "warning";
        }
        
        if (filters.riskStatus !== status) {
          return false;
        }
      }

      // Velocity filter
      if (filters.velocity !== "all") {
        const velocity = holding.buyingVelocity;
        if (filters.velocity === "high" && velocity < 10000) return false;
        if (filters.velocity === "medium" && (velocity < 2000 || velocity >= 10000)) return false;
        if (filters.velocity === "low" && velocity >= 2000) return false;
      }

      // Data freshness filter
      if (filters.dataFreshness !== "all") {
        const parsed = new Date(holding.lastUpdated);
        const ageMs = Date.now() - parsed.getTime();
        const oneMinute = 60 * 1000;
        const fifteenMinutes = 15 * 60 * 1000;
        const oneHour = 60 * 60 * 1000;

        if (filters.dataFreshness === "fresh" && ageMs >= fifteenMinutes) return false;
        if (filters.dataFreshness === "stale" && (ageMs < fifteenMinutes || ageMs >= oneHour)) return false;
        if (filters.dataFreshness === "error" && ageMs < oneHour) return false;
      }

      return true;
    });
  }, [holdings, filters]);

  const getStatusBadge = (status: string, timeToBreach: string) => {
    if (status === "breach") {
      return (
        <Badge variant="danger" className="gap-1">
          <XCircle className="w-3 h-3" />
          Active Breach
        </Badge>
      );
    } else if (status === "warning") {
      return (
        <Badge variant="warning" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          {timeToBreach}
        </Badge>
      );
    } else {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Safe
        </Badge>
      );
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const shouldPulse = (status: string, buyingVelocity: number) => {
    return status === "warning" && buyingVelocity > 5000;
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.jurisdiction) count++;
    if (filters.riskStatus !== "all") count++;
    if (filters.velocity !== "all") count++;
    if (filters.dataFreshness !== "all") count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      jurisdiction: null,
      riskStatus: "all",
      velocity: "all",
      dataFreshness: "all",
    });
  };

  const jurisdictions = useMemo(() => {
    const unique = Array.from(new Set(holdings.map(h => h.jurisdiction)));
    return unique.sort();
  }, [holdings]);

  return (
    <Card className="w-full">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Predictive Breach Analysis</h2>
            {activeFilterCount > 0 && (
              <Badge variant="outline" className="gap-1">
                {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="mb-4 p-4 border border-border rounded-lg bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Jurisdiction Filter */}
              <div className="space-y-2">
                <Label htmlFor="jurisdiction-filter" className="text-xs font-medium">
                  Jurisdiction
                </Label>
                <Select
                  value={filters.jurisdiction || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, jurisdiction: value === "all" ? null : value })
                  }
                >
                  <SelectTrigger id="jurisdiction-filter" className="h-9">
                    <SelectValue placeholder="All Jurisdictions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jurisdictions</SelectItem>
                    {jurisdictions.map((jur) => (
                      <SelectItem key={jur} value={jur}>
                        {jur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Risk Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="risk-status-filter" className="text-xs font-medium">
                  Risk Status
                </Label>
                <Select
                  value={filters.riskStatus}
                  onValueChange={(value) =>
                    setFilters({ ...filters, riskStatus: value as RiskStatusFilter })
                  }
                >
                  <SelectTrigger id="risk-status-filter" className="h-9">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="breach">Active Breach</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="safe">Safe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Buying Velocity Filter */}
              <div className="space-y-2">
                <Label htmlFor="velocity-filter" className="text-xs font-medium">
                  Buying Velocity
                </Label>
                <Select
                  value={filters.velocity}
                  onValueChange={(value) =>
                    setFilters({ ...filters, velocity: value as VelocityFilter })
                  }
                >
                  <SelectTrigger id="velocity-filter" className="h-9">
                    <SelectValue placeholder="All Velocities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Velocities</SelectItem>
                    <SelectItem value="high">High (≥10k shares/hr)</SelectItem>
                    <SelectItem value="medium">Medium (2k-10k shares/hr)</SelectItem>
                    <SelectItem value="low">Low (&lt;2k shares/hr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Freshness Filter */}
              <div className="space-y-2">
                <Label htmlFor="freshness-filter" className="text-xs font-medium">
                  Data Freshness
                </Label>
                <Select
                  value={filters.dataFreshness}
                  onValueChange={(value) =>
                    setFilters({ ...filters, dataFreshness: value as DataFreshnessFilter })
                  }
                >
                  <SelectTrigger id="freshness-filter" className="h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="fresh">Fresh (&lt;15m)</SelectItem>
                    <SelectItem value="stale">Stale (15m-1h)</SelectItem>
                    <SelectItem value="error">Feed Error (&gt;1h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="mb-2 text-sm text-muted-foreground">
          Showing {filteredHoldings.length} of {holdings.length} holdings
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Issuer
                </th>
                <th className="text-left p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ISIN
                </th>
                <th className="text-left p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Jurisdiction
                </th>
                <th className="text-right p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Price
                </th>
                <th className="text-right p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current Position %
                </th>
                <th className="text-right p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Buying Velocity
                </th>
                <th className="text-left p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Projected Breach Time
                </th>
                <th className="text-left p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Regulatory Filing
                </th>
                <th className="text-center p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.map((holding) => (
                <PredictiveRow
                  key={holding.id}
                  holding={holding}
                  onRowClick={onRowClick}
                  shouldPulse={shouldPulse}
                  getStatusBadge={getStatusBadge}
                  formatNumber={formatNumber}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

interface PredictiveRowProps {
  holding: Holding;
  onRowClick: (ticker: string) => void;
  shouldPulse: (status: string, buyingVelocity: number) => boolean;
  getStatusBadge: (status: string, timeToBreach: string) => React.ReactNode;
  formatNumber: (num: number) => string;
}

function PredictiveRow({
  holding,
  onRowClick,
  shouldPulse,
  getStatusBadge,
  formatNumber,
}: PredictiveRowProps) {
  const { breach, compliance, ownershipPercent } = useRiskCalculator(
    holding.ticker
  );
  const { appendLog } = useAuditLog();
  const [breachStatus, setBreachStatus] = useState<"OPEN" | "ACK" | "RESOLVED">(
    "OPEN"
  );

  const previousBreachStatusRef = React.useRef<"breach" | "warning" | "safe" | null>(null);

  useEffect(() => {
    if (!breach || !ownershipPercent) return;
    
    const currentStatus = breach.status;
    const previousStatus = previousBreachStatusRef.current;

    // Record breach events when status changes
    if (currentStatus === "breach" && previousStatus !== "breach") {
      // New breach detected
      historicalDataStore.recordBreachEvent({
        ticker: holding.ticker,
        jurisdiction: holding.jurisdiction,
        eventType: "BREACH_DETECTED",
        ownershipPercent,
        threshold: holding.regulatoryRule.threshold,
        buyingVelocity: holding.buyingVelocity,
        projectedBreachTime: breach.projectedBreachTime,
      });
      
      const timestamp = new Date().toISOString();
      const systemId = "RISK-ENGINE-01";
      const velocityLabel = `${holding.buyingVelocity.toLocaleString()} /hr`;
      const line = `[${timestamp}] [${systemId}] [BREACH]: Detected potential breach for ${holding.ticker} (${holding.jurisdiction}). Velocity: ${velocityLabel}.`;
      appendLog(line);
    } else if (currentStatus === "warning" && previousStatus !== "warning") {
      // New warning detected
      historicalDataStore.recordBreachEvent({
        ticker: holding.ticker,
        jurisdiction: holding.jurisdiction,
        eventType: "WARNING_DETECTED",
        ownershipPercent,
        threshold: holding.regulatoryRule.threshold,
        buyingVelocity: holding.buyingVelocity,
        projectedBreachTime: breach.projectedBreachTime,
      });
    } else if (previousStatus === "breach" && currentStatus !== "breach") {
      // Breach resolved
      historicalDataStore.recordBreachEvent({
        ticker: holding.ticker,
        jurisdiction: holding.jurisdiction,
        eventType: "BREACH_RESOLVED",
        ownershipPercent,
        threshold: holding.regulatoryRule.threshold,
        buyingVelocity: holding.buyingVelocity,
        projectedBreachTime: breach.projectedBreachTime,
      });
    } else if (previousStatus === "warning" && currentStatus === "safe") {
      // Warning cleared
      historicalDataStore.recordBreachEvent({
        ticker: holding.ticker,
        jurisdiction: holding.jurisdiction,
        eventType: "WARNING_CLEARED",
        ownershipPercent,
        threshold: holding.regulatoryRule.threshold,
        buyingVelocity: holding.buyingVelocity,
        projectedBreachTime: breach.projectedBreachTime,
      });
    }

    previousBreachStatusRef.current = currentStatus;
  }, [appendLog, breach, holding.buyingVelocity, holding.jurisdiction, holding.ticker, holding.regulatoryRule.threshold, ownershipPercent]);

  const deadlineInfo = useMemo(() => {
    if (!compliance?.deadlineDays || compliance.deadlineDays <= 0) {
      return { label: compliance?.deadline || "", adjustedNote: "" };
    }

    const { date, adjustedForHoliday } = calculateBusinessDeadline(
      new Date(),
      compliance.deadlineDays,
      holding.jurisdiction
    );
    // Use UTC to avoid timezone-related hydration issues
    const day = String(date.getUTCDate()).padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    const formattedDate = `${day} ${month} ${year}`;

    const adjustedNote =
      adjustedForHoliday && holding.jurisdiction === "UK"
        ? " (Adj. for UK Holiday)"
        : "";

    return {
      label: `${formattedDate}`,
      adjustedNote,
    };
  }, [compliance?.deadlineDays, compliance?.deadline, holding.jurisdiction]);

  const dataConfidence = useMemo(() => {
    const parsed = new Date(holding.lastUpdated);
    const ageMs = Date.now() - parsed.getTime();

    const oneMinute = 60 * 1000;
    const fifteenMinutes = 15 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    if (ageMs < oneMinute) {
      return {
        color: "bg-emerald-400",
        ring: "bg-emerald-400/40",
        label: "Fresh (<1m)",
      };
    }

    if (ageMs > oneHour) {
      return {
        color: "bg-red-500",
        ring: "bg-red-500/40",
        label: "Feed Error (>1h)",
      };
    }

    if (ageMs > fifteenMinutes) {
      return {
        color: "bg-amber-400",
        ring: "bg-amber-400/40",
        label: "Stale (>15m)",
      };
    }

    return {
      color: "bg-emerald-400",
      ring: "bg-emerald-400/40",
      label: "Fresh",
    };
  }, [holding.lastUpdated]);

  if (!breach || ownershipPercent == null || !compliance) {
    return null;
  }

  const pulse = shouldPulse(breach.status, holding.buyingVelocity);

  const handleWorkflowAction = (action: "ACK" | "RESOLVED") => {
    const timestamp = new Date().toISOString();
    const systemId = "RISK-ENGINE-01";
    const previous = breachStatus;
    const next = action === "ACK" ? "ACK" : "RESOLVED";
    setBreachStatus(next);
    const line = `[${timestamp}] [${systemId}] [BREACH_WORKFLOW]: ${holding.ticker} status changed from ${previous} to ${next} by user. Jurisdiction=${holding.jurisdiction}.`;
    appendLog(line);
    
    // Record workflow event
    if (action === "ACK") {
      historicalDataStore.recordBreachEvent({
        ticker: holding.ticker,
        jurisdiction: holding.jurisdiction,
        eventType: "BREACH_ACKNOWLEDGED",
        ownershipPercent: ownershipPercent || 0,
        threshold: holding.regulatoryRule.threshold,
        buyingVelocity: holding.buyingVelocity,
        projectedBreachTime: breach?.projectedBreachTime,
        metadata: { previousStatus: previous, newStatus: next },
      });
    } else if (action === "RESOLVED") {
      historicalDataStore.recordBreachEvent({
        ticker: holding.ticker,
        jurisdiction: holding.jurisdiction,
        eventType: "BREACH_RESOLVED",
        ownershipPercent: ownershipPercent || 0,
        threshold: holding.regulatoryRule.threshold,
        buyingVelocity: holding.buyingVelocity,
        projectedBreachTime: breach?.projectedBreachTime,
        metadata: { previousStatus: previous, newStatus: next, resolvedBy: "user" },
      });
    }
  };

  return (
    <motion.tr
      className={`border-b border-border hover:bg-accent/50 cursor-pointer transition-colors ${
        pulse ? "bg-amber-500/10" : ""
      }`}
      onClick={() => onRowClick(holding.ticker)}
      animate={
        pulse
          ? {
              backgroundColor: [
                "rgba(245, 158, 11, 0.1)",
                "rgba(245, 158, 11, 0.2)",
                "rgba(245, 158, 11, 0.1)",
              ],
            }
          : {}
      }
      transition={{
        duration: 2,
        repeat: pulse ? Infinity : 0,
        ease: "easeInOut",
      }}
    >
      <td className="p-2 text-sm font-medium">
        <div className="flex items-center gap-2">
          <div
            className="relative flex items-center justify-center"
            title="Source: Custodian Feed | Latency: 42ms"
          >
            <span
              className={`absolute inline-flex h-3 w-3 rounded-full opacity-75 animate-ping ${dataConfidence.ring}`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${dataConfidence.color}`}
            />
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {holding.ticker}
          </span>
          <span>{holding.issuer}</span>
        </div>
      </td>
      <td className="p-2 text-xs font-mono text-muted-foreground">
        {holding.isin}
      </td>
      <td className="p-2 text-sm">{holding.jurisdiction}</td>
      <td className="p-2 text-sm text-right font-mono">
        {holding.price !== undefined ? (
          <div className="flex items-center justify-end gap-1">
            <span className="text-foreground">
              {holding.jurisdiction === "UK" ? "£" : holding.jurisdiction === "Hong Kong" ? "HK$" : "$"}
              {holding.price.toLocaleString("en-US", {
                minimumFractionDigits: holding.jurisdiction === "APAC" && holding.ticker.includes(".KS") ? 0 : 2,
                maximumFractionDigits: holding.jurisdiction === "APAC" && holding.ticker.includes(".KS") ? 0 : 2,
              })}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Real-time price" />
          </div>
        ) : (
          <span className="text-muted-foreground">--</span>
        )}
      </td>
      <td className="p-2 text-sm text-right font-mono">
        {formatNumber(ownershipPercent)}%
      </td>
      <td className="p-2 text-sm text-right font-mono">
        {holding.buyingVelocity.toLocaleString()} shares/hr
      </td>
      <td className="p-2 text-sm">
        <div className="flex flex-col gap-1">
          {getStatusBadge(breach.status, breach.timeToBreach)}
          {breach.status === "breach" && (
            <div className="flex gap-1 justify-start">
              {breachStatus === "OPEN" && (
                <button
                  className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/40"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWorkflowAction("ACK");
                  }}
                >
                  Acknowledge
                </button>
              )}
              {breachStatus !== "RESOLVED" && (
                <button
                  className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/40"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWorkflowAction("RESOLVED");
                  }}
                >
                  Mark Resolved
                </button>
              )}
              {breachStatus === "RESOLVED" && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/40">
                  Resolved
                </span>
              )}
            </div>
          )}
        </div>
      </td>
      <td className="p-2 text-xs">
        <div className="flex flex-col gap-1">
          <span className="font-mono font-semibold">
            {compliance.requiredForm}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Deadline: {deadlineInfo.label}
            {deadlineInfo.adjustedNote}
          </span>
        </div>
      </td>
      <td className="p-2 text-center">
        <button className="text-xs text-primary hover:underline">
          View Details
        </button>
      </td>
    </motion.tr>
  );
}

