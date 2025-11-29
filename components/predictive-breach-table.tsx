"use client";

import { useMemo, useState, useEffect, memo } from "react";
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
import { useRisk } from "@/components/RiskContext";
import { useRiskCalculator } from "@/lib/use-risk-calculator";
import { getGroupExposure } from "@/lib/exposure-aggregation";
import { evaluateRisk } from "@/lib/compliance-rules-engine";
import type { Holding } from "@/types";
import { AlertTriangle, CheckCircle2, XCircle, Filter, X } from "lucide-react";
import { calculateBusinessDeadline } from "@/lib/compliance-rules-engine";
import { useAuditLog } from "@/components/AuditLogContext";
import { historicalDataStore } from "@/lib/historical-data-store";
import AdvancedFilter, { type AdvancedFilterConfig } from "@/components/advanced-filter";
import { applyAdvancedFilter, highlightSearchText } from "@/lib/filter-utils";
import { EscalationModal } from "@/components/escalation-modal";
import type { AlertStatus } from "@/types";

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

function PredictiveBreachTable({
  onRowClick,
}: PredictiveBreachTableProps) {
  const { holdings } = usePortfolio();
  const { aggregationScope } = useRisk();
  const [advancedFilterConfig, setAdvancedFilterConfig] = useState<AdvancedFilterConfig>({});
  const [useAdvancedFilter, setUseAdvancedFilter] = useState(true);

  // Helper function to get risk status for a holding
  const getRiskStatus = (holding: Holding, ownershipPercent?: number): "breach" | "warning" | "safe" => {
    const percent = ownershipPercent ?? (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
    const threshold = holding.regulatoryRule.threshold;
    const warningMin = threshold * 0.9;
    
    if (percent >= threshold) {
      return "breach";
    } else if (percent >= warningMin && percent < threshold) {
      return "warning";
    }
    return "safe";
  };

  // Aggregate holdings by ticker when scope is GROUP
  const processedHoldings = useMemo(() => {
    if (aggregationScope === "GROUP") {
      // Group holdings by ticker
      const tickerMap = new Map<string, Holding[]>();
      holdings.forEach((holding) => {
        const existing = tickerMap.get(holding.ticker) || [];
        tickerMap.set(holding.ticker, [...existing, holding]);
      });

      // Create aggregated holdings (one per ticker)
      const aggregated: Holding[] = [];
      tickerMap.forEach((tickerHoldings, ticker) => {
        if (tickerHoldings.length === 0) return;

        // Use the first holding as a template
        const baseHolding = tickerHoldings[0];
        
        // Sum up shares and buying velocity
        const totalShares = tickerHoldings.reduce((sum, h) => sum + h.sharesOwned, 0);
        const totalBuyingVelocity = tickerHoldings.reduce((sum, h) => sum + h.buyingVelocity, 0);
        
        // Use the most recent lastUpdated
        const mostRecent = tickerHoldings.reduce((latest, h) => 
          new Date(h.lastUpdated) > new Date(latest.lastUpdated) ? h : latest
        );

        aggregated.push({
          ...baseHolding,
          id: `AGG-${ticker}`,
          sharesOwned: totalShares,
          buyingVelocity: totalBuyingVelocity,
          lastUpdated: mostRecent.lastUpdated,
          // Remove fundId/parentId for aggregated view
          fundId: undefined,
          parentId: undefined,
        });
      });

      // Apply filters to aggregated holdings
      if (useAdvancedFilter) {
        return applyAdvancedFilter(aggregated, advancedFilterConfig, (h) => {
          const groupExposure = getGroupExposure(holdings, h.ticker);
          return getRiskStatus(h, groupExposure);
        });
      }
      return aggregated;
    } else {
      // FUND scope: use holdings as-is
      if (useAdvancedFilter) {
        return applyAdvancedFilter(holdings, advancedFilterConfig, getRiskStatus);
      }
      return holdings;
    }
  }, [holdings, aggregationScope, advancedFilterConfig, useAdvancedFilter]);

  const filteredHoldings = processedHoldings;

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
          </div>
        </div>

        <AdvancedFilter
          config={advancedFilterConfig}
          onConfigChange={setAdvancedFilterConfig}
          availableFields={["ticker", "issuer", "isin"]}
          className="mb-4"
        />

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
                  aggregationScope={aggregationScope}
                  allHoldings={holdings}
                  advancedFilterConfig={advancedFilterConfig}
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
  aggregationScope: "FUND" | "GROUP";
  allHoldings: Holding[];
  advancedFilterConfig: AdvancedFilterConfig;
}

function PredictiveRow({
  holding,
  onRowClick,
  shouldPulse,
  getStatusBadge,
  formatNumber,
  aggregationScope,
  allHoldings,
  advancedFilterConfig,
}: PredictiveRowProps) {
  const { appendLog } = useAuditLog();
  const [alertStatus, setAlertStatus] = useState<AlertStatus>("OPEN");
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  
  const previousBreachStatusRef = React.useRef<"breach" | "warning" | "safe" | null>(null);
  
  // Calculate ownership percent based on scope
  const ownershipPercent = useMemo(() => {
    if (aggregationScope === "GROUP") {
      // Use aggregated exposure for group level
      return getGroupExposure(allHoldings, holding.ticker);
    } else {
      // Use individual holding exposure for fund level
      return (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
    }
  }, [aggregationScope, allHoldings, holding.ticker, holding.sharesOwned, holding.totalSharesOutstanding]);

  // Calculate breach and compliance based on aggregated exposure
  const breach = useMemo(() => {
    const threshold = holding.regulatoryRule.threshold;
    const warningMin = threshold * 0.9;
    
    if (ownershipPercent >= threshold) {
      return {
        status: "breach" as const,
        projectedBreachTime: 0,
        timeToBreach: "Active Breach",
      };
    } else if (ownershipPercent >= warningMin && ownershipPercent < threshold) {
      // Calculate time to breach based on buying velocity
      if (holding.buyingVelocity > 0) {
        const sharesToBreach = (threshold / 100) * holding.totalSharesOutstanding - holding.sharesOwned;
        const hoursToBreach = sharesToBreach / holding.buyingVelocity;
        return {
          status: "warning" as const,
          projectedBreachTime: hoursToBreach,
          timeToBreach: hoursToBreach < 24 
            ? `Breach in ${hoursToBreach.toFixed(1)}h`
            : `Breach in ${(hoursToBreach / 24).toFixed(1)}d`,
        };
      }
    }
    return {
      status: "safe" as const,
      projectedBreachTime: null,
      timeToBreach: "Safe",
    };
  }, [ownershipPercent, holding.regulatoryRule.threshold, holding.totalSharesOutstanding, holding.sharesOwned, holding.buyingVelocity]);

  const compliance = useMemo(() => {
    return evaluateRisk(holding.jurisdiction, ownershipPercent, "long");
  }, [holding.jurisdiction, ownershipPercent]);

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

  // Check if this is a high-severity alert (BREACH status)
  const isHighSeverity = breach.status === "breach";

  const handleDismissRequest = () => {
    if (isHighSeverity) {
      // Open escalation modal for high-severity alerts
      setIsEscalationModalOpen(true);
    } else {
      // For non-high-severity alerts, allow direct dismissal
      handleDismissConfirmed("");
    }
  };

  const handleDismissConfirmed = (justification: string) => {
    const timestamp = new Date().toISOString();
    const systemId = "RISK-ENGINE-01";
    
    if (isHighSeverity && justification) {
      // Change status to PENDING_SUPERVISOR_REVIEW
      setAlertStatus("PENDING_SUPERVISOR_REVIEW");
      
      // Log to audit trail
      const line = `[${timestamp}] [${systemId}] [BREACH_WORKFLOW]: User requested dismissal for ${holding.ticker} (${holding.issuer}). Status: PENDING_SUPERVISOR_REVIEW. Justification: ${justification}`;
      appendLog(line);
      
      // Record in historical data store
      historicalDataStore.recordBreachEvent({
        ticker: holding.ticker,
        jurisdiction: holding.jurisdiction,
        eventType: "BREACH_ACKNOWLEDGED",
        ownershipPercent: ownershipPercent || 0,
        threshold: holding.regulatoryRule.threshold,
        buyingVelocity: holding.buyingVelocity,
        projectedBreachTime: breach?.projectedBreachTime,
        metadata: {
          alertStatus: "PENDING_SUPERVISOR_REVIEW",
          justification,
          requiresSupervisorApproval: true,
        },
      });
    }
  };

  const handleWorkflowAction = (action: "ACK" | "RESOLVED") => {
    const timestamp = new Date().toISOString();
    const systemId = "RISK-ENGINE-01";
    const previous = alertStatus;
    const next = action === "ACK" ? "ACKNOWLEDGED" : "RESOLVED";
    setAlertStatus(next);
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
            {advancedFilterConfig.searchText
              ? highlightSearchText(holding.ticker, advancedFilterConfig.searchText)
              : holding.ticker}
          </span>
          <span>
            {advancedFilterConfig.searchText
              ? highlightSearchText(holding.issuer, advancedFilterConfig.searchText)
              : holding.issuer}
          </span>
        </div>
      </td>
      <td className="p-2 text-xs font-mono text-muted-foreground">
        {advancedFilterConfig.searchText
          ? highlightSearchText(holding.isin, advancedFilterConfig.searchText)
          : holding.isin}
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
            <div className="flex gap-1 justify-start flex-wrap">
              {alertStatus === "OPEN" && (
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
              {alertStatus !== "RESOLVED" && alertStatus !== "DISMISSED" && (
                <button
                  className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/40"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissRequest();
                  }}
                >
                  Dismiss
                </button>
              )}
              {alertStatus === "PENDING_SUPERVISOR_REVIEW" && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 border border-amber-500/40 font-semibold">
                  Pending Review
                </span>
              )}
              {alertStatus === "RESOLVED" && (
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
      <EscalationModal
        open={isEscalationModalOpen}
        onOpenChange={setIsEscalationModalOpen}
        ticker={holding.ticker}
        issuer={holding.issuer}
        onConfirm={handleDismissConfirmed}
      />
    </motion.tr>
  );
}

// OPTIMIZED: Memoize component to prevent unnecessary re-renders
export default memo(PredictiveBreachTable);

