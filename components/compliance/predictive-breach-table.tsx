"use client";

import { useMemo, useState, useEffect, memo, useCallback } from "react";
import React from "react";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import { usePortfolio } from "@/components/contexts/PortfolioContext";
import { useRisk } from "@/components/contexts/RiskContext";
import { useRiskCalculator } from "@/lib/use-risk-calculator";
import { calculateDeltaAdjustedExposure } from "@/lib/calculation-utils";
import { getGroupExposure } from "@/lib/exposure-aggregation";
import { evaluateRisk, checkDenominatorConfidence } from "@/lib/compliance-rules-engine";
import { calculateTrueExposure, hasHiddenExposure } from "@/lib/compliance-engine";
import type { Holding } from "@/types";
import { AlertTriangle, CheckCircle2, XCircle, Filter, X, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { calculateBusinessDeadline } from "@/lib/compliance-rules-engine";
import { useAuditLog } from "@/components/contexts/AuditLogContext";
import { historicalDataStore } from "@/lib/historical-data-store";
import AdvancedFilter, { type AdvancedFilterConfig } from "@/components/advanced-filter";
import { applyAdvancedFilter, highlightSearchText } from "@/lib/filter-utils";
import { EscalationModal } from "@/components/notifications/escalation-modal";
import type { AlertStatus } from "@/types";
import { VirtualizedTableWrapper } from "@/components/ui/virtualized-table-wrapper";
import { throttle } from "@/lib/performance-utils";

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
    const percent = ownershipPercent ?? (() => {
      const totalExposure = calculateDeltaAdjustedExposure(holding);
      return (totalExposure / holding.totalSharesOutstanding) * 100;
    })();
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
  // OPTIMIZED: Use more efficient aggregation with Map to avoid array copies
  const processedHoldings = useMemo(() => {
    if (aggregationScope === "GROUP") {
      // Group holdings by ticker - optimized to avoid unnecessary array operations
      const tickerMap = new Map<string, Holding[]>();
      holdings.forEach((holding) => {
        const existing = tickerMap.get(holding.ticker);
        if (existing) {
          existing.push(holding);
        } else {
          tickerMap.set(holding.ticker, [holding]);
        }
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
        <VirtualizedTableWrapper
          data={filteredHoldings}
          renderHeader={() => (
            <thead>
              <tr className="border-b border-border sticky top-0 bg-background z-10">
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
          )}
          renderRow={(holding) => (
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
          )}
          estimateSize={() => 80}
          maxHeight="600px"
        />
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
  const [isXRayExpanded, setIsXRayExpanded] = useState(false);
  
  const previousBreachStatusRef = React.useRef<"breach" | "warning" | "safe" | null>(null);
  
  // Check if this holding has hidden exposure via ETFs
  const hasHidden = useMemo(() => {
    // Only check for hidden exposure if this is not an ETF itself
    // Skip ETFs from being analyzed (they don't need look-through)
    if (holding.ticker === "SPY" || holding.ticker === "QQQ") {
      return false;
    }
    return hasHiddenExposure(holding.ticker, allHoldings);
  }, [holding.ticker, allHoldings]);
  
  // Calculate true exposure (with ETF look-through) when X-Ray is expanded
  const trueExposure = useMemo(() => {
    if (!isXRayExpanded || !hasHidden) {
      return null;
    }
    return calculateTrueExposure(holding.ticker, allHoldings);
  }, [isXRayExpanded, hasHidden, holding.ticker, allHoldings]);
  
  // Calculate ownership percent based on scope (using delta-adjusted exposure)
  const ownershipPercent = useMemo(() => {
    if (aggregationScope === "GROUP") {
      // Use aggregated exposure for group level (already uses delta-adjusted exposure)
      return getGroupExposure(allHoldings, holding.ticker);
    } else {
      // Use individual holding exposure for fund level with delta-adjusted exposure
      const totalExposure = calculateDeltaAdjustedExposure(holding);
      return (totalExposure / holding.totalSharesOutstanding) * 100;
    }
  }, [aggregationScope, allHoldings, holding]);

  // Check denominator confidence for data quality warning
  const denominatorCheck = useMemo(() => {
    return checkDenominatorConfidence(
      holding.totalShares_Bloomberg,
      holding.totalShares_Refinitiv,
      holding.totalSharesOutstanding
    );
  }, [holding.totalShares_Bloomberg, holding.totalShares_Refinitiv, holding.totalSharesOutstanding]);

  // Calculate total exposure for breach calculations
  const totalExposure = useMemo(() => {
    return calculateDeltaAdjustedExposure(holding);
  }, [holding]);

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
      // Use totalExposure (delta-adjusted) instead of sharesOwned
      if (holding.buyingVelocity > 0) {
        const thresholdShares = (threshold / 100) * holding.totalSharesOutstanding;
        const sharesToBreach = thresholdShares - totalExposure;
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
  }, [ownershipPercent, holding.regulatoryRule.threshold, holding.totalSharesOutstanding, totalExposure, holding.buyingVelocity]);

  const compliance = useMemo(() => {
    return evaluateRisk(holding.jurisdiction, ownershipPercent, "long", denominatorCheck.hasWarning);
  }, [holding.jurisdiction, ownershipPercent, denominatorCheck.hasWarning]);

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

  // OPTIMIZED: Reduce animation complexity for lower CPU usage
  // Only animate if absolutely necessary (high-severity warnings)
  const shouldAnimate = pulse && breach.status === "warning" && holding.buyingVelocity > 10000;
  
  return (
    <>
    <motion.tr
      className={`border-b border-border hover:bg-accent/50 cursor-pointer transition-colors ${
        pulse ? "bg-amber-500/10" : ""
      }`}
      onClick={() => onRowClick(holding.ticker)}
      animate={
        shouldAnimate
          ? {
              backgroundColor: [
                "rgba(245, 158, 11, 0.1)",
                "rgba(245, 158, 11, 0.15)",
                "rgba(245, 158, 11, 0.1)",
              ],
            }
          : {}
      }
      transition={
        shouldAnimate
          ? {
              duration: 3, // Slower animation = less CPU
              repeat: Infinity,
              ease: "easeInOut",
            }
          : {}
      }
    >
      <td className="p-2 text-sm font-medium">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {/* Data Confidence Indicator */}
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
            {/* Data Quality Warning Indicator */}
            {denominatorCheck.hasWarning && (
              <div
                className="relative flex items-center justify-center"
                title="Data Quality Warning: Bloomberg and Refinitiv differ by >1%"
              >
                <motion.span
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inline-flex h-3 w-3 rounded-full bg-yellow-500 opacity-75 animate-ping"
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
              </div>
            )}
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
          {/* X-Ray Icon for Hidden Exposure */}
          {hasHidden && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsXRayExpanded(!isXRayExpanded);
              }}
              className="ml-2 p-1 hover:bg-accent rounded transition-colors"
              title="X-Ray: View hidden exposure via ETFs"
            >
              <Eye className={`w-4 h-4 ${isXRayExpanded ? "text-primary" : "text-muted-foreground"}`} />
            </button>
          )}
          {/* Flash Recon Indicator */}
          {holding.lastReconTimestamp && holding.reconStatus && (
            <Badge
              variant={holding.reconStatus === "MATCH" ? "outline" : "warning"}
              className="text-xs ml-1"
              title={`Last Ledger Check: ${new Date(holding.lastReconTimestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
            >
              {holding.reconStatus === "MATCH" ? "✓" : "⚠"} Recon
            </Badge>
          )}
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
        <div className="flex flex-col items-end">
          <span>{formatNumber(ownershipPercent)}%</span>
          {hasHidden && (
            <span className="text-[10px] text-muted-foreground mt-0.5 italic">
              Direct only
            </span>
          )}
        </div>
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
    {isXRayExpanded && trueExposure && (
      <tr>
        <td colSpan={9} className="p-0 bg-muted/30">
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-muted/50 border-l-4 border-primary"
          >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Level 3 Look-Through Analysis: {holding.ticker}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsXRayExpanded(false);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  Decomposing ETF holdings to reveal hidden exposure that standard systems miss.
                </div>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 text-xs font-semibold text-muted-foreground uppercase">Source</th>
                      <th className="text-right p-2 text-xs font-semibold text-muted-foreground uppercase">Exposure %</th>
                      <th className="text-right p-2 text-xs font-semibold text-muted-foreground uppercase">Shares</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trueExposure.breakdown.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-2">
                          {item.source === "direct" ? (
                            <span className="font-medium">Direct Holding ({holding.ticker})</span>
                          ) : (
                            <span className="text-muted-foreground">
                              via <span className="font-mono font-medium">{item.etfTicker}</span> ETF
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {item.source === "direct" ? (
                            <span className={trueExposure.directPercentage >= trueExposure.threshold ? "text-red-500 font-semibold" : ""}>
                              {formatNumber(item.percentage)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">+{formatNumber(item.percentage)}%</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono text-xs text-muted-foreground">
                          {item.shares.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary/50 bg-primary/5">
                      <td className="p-2 font-semibold">
                        <span className={trueExposure.isBreach ? "text-red-500" : ""}>
                          TOTAL EFFECTIVE OWNERSHIP
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">
                        <span className={trueExposure.isBreach ? "text-red-500" : "text-foreground"}>
                          {formatNumber(trueExposure.totalPercentage)}%
                        </span>
                        {trueExposure.isBreach && (
                          <Badge variant="danger" className="ml-2">
                            BREACH
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-muted-foreground">
                        {trueExposure.totalShares.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-3 text-xs text-muted-foreground italic">
                  Threshold: {trueExposure.threshold}% | 
                  Direct: {formatNumber(trueExposure.directPercentage)}% | 
                  Hidden: +{formatNumber(trueExposure.totalPercentage - trueExposure.directPercentage)}%
                </div>
                <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="font-semibold">Shares Outstanding:</span> {trueExposure.totalSharesOutstanding.toLocaleString("en-US", { maximumFractionDigits: 0 })} shares
                </div>
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </>
  );
}

// OPTIMIZED: Memoize component to prevent unnecessary re-renders
export default memo(PredictiveBreachTable);

