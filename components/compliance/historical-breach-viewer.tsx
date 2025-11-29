"use client";

import { useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { historicalDataStore } from "@/lib/historical-data-store";
import type { BreachEvent, Jurisdiction } from "@/types";
import { AlertTriangle, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AdvancedFilter, { type AdvancedFilterConfig } from "@/components/advanced-filter";
import { highlightSearchText } from "@/lib/filter-utils";
import { getAdaptiveSettings } from "@/lib/performance-utils";

function VirtualizedBreachEventsList({
  events,
  advancedFilterConfig,
  getEventIcon,
  getEventBadge,
  highlightSearchText,
}: {
  events: BreachEvent[];
  advancedFilterConfig: AdvancedFilterConfig;
  getEventIcon: (eventType: BreachEvent["eventType"]) => React.ReactNode;
  getEventBadge: (eventType: BreachEvent["eventType"]) => React.ReactNode;
  highlightSearchText: (text: string, search: string) => React.ReactNode;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Adaptive overscan based on device capabilities
  const adaptiveSettings = useMemo(() => getAdaptiveSettings(), []);
  
  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: adaptiveSettings.isLowPower ? 3 : 5, // Less overscan for low-power devices
  });

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground space-y-2">
        <div className="text-sm font-medium">No breach events found for the selected filters</div>
        <div className="text-xs">
          Breach events are automatically recorded when breaches are detected, acknowledged, or resolved.
          <br />
          Try adjusting the time range or filters, or wait for breach events to occur.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="overflow-auto space-y-2"
      style={{ maxHeight: "600px" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const event = events[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="p-3 border border-border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors mb-2"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getEventIcon(event.eventType)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-semibold text-sm">
                        {advancedFilterConfig.searchText
                          ? highlightSearchText(event.ticker, advancedFilterConfig.searchText)
                          : event.ticker}
                      </span>
                      {getEventBadge(event.eventType)}
                      <Badge variant="outline" className="text-xs">
                        {event.jurisdiction}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        Ownership: {event.ownershipPercent.toFixed(2)}% (Threshold: {event.threshold}%)
                      </div>
                      <div>
                        Velocity: {event.buyingVelocity.toLocaleString()} shares/hr
                      </div>
                      {(event.projectedBreachTime !== null && event.projectedBreachTime !== undefined) || event.eventType === "BREACH_DETECTED" ? (
                        <div>
                          Projected Breach Time: {event.projectedBreachTime !== null && event.projectedBreachTime !== undefined 
                            ? event.projectedBreachTime.toFixed(1) 
                            : "0.0"} hours
                        </div>
                      ) : null}
                      <div className="text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HistoricalBreachViewer() {
  const [advancedFilterConfig, setAdvancedFilterConfig] = useState<AdvancedFilterConfig>({});
  const [useAdvancedFilter, setUseAdvancedFilter] = useState(true);

  // Use adaptive settings based on device capabilities
  const adaptiveSettings = useMemo(() => getAdaptiveSettings(), []);
  
  const breachEvents = useMemo(() => {
    let query: any = {
      limit: adaptiveSettings.isLowPower ? 2000 : 5000, // Lower limit for low-power devices
    };

    // Apply advanced filter config
    if (useAdvancedFilter && advancedFilterConfig) {
      if (advancedFilterConfig.searchText?.trim()) {
        // For breach events, search in ticker
        query.ticker = advancedFilterConfig.searchText.trim();
      }
      
      if (advancedFilterConfig.jurisdictions && advancedFilterConfig.jurisdictions.length > 0) {
        // For now, use the first jurisdiction (can be enhanced to support multiple)
        query.jurisdiction = advancedFilterConfig.jurisdictions[0];
      }

      if (advancedFilterConfig.lastUpdatedFrom) {
        query.startTime = advancedFilterConfig.lastUpdatedFrom;
      }
      
      if (advancedFilterConfig.lastUpdatedTo) {
        query.endTime = advancedFilterConfig.lastUpdatedTo;
      } else if (!advancedFilterConfig.lastUpdatedFrom) {
        // Default to last 7 days if no date range specified
        const now = new Date();
        query.startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      }
    } else {
      // Default to last 24 hours
      const now = new Date();
      query.startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }

    let events = historicalDataStore.queryBreachEvents(query);

    // Apply additional client-side filters
    if (useAdvancedFilter && advancedFilterConfig) {
      // Filter by event type (risk status mapping)
      if (advancedFilterConfig.riskStatus && advancedFilterConfig.riskStatus.length > 0) {
        const eventTypeMap: Record<string, string[]> = {
          breach: ["BREACH_DETECTED", "BREACH_ACKNOWLEDGED", "BREACH_RESOLVED"],
          warning: ["WARNING_DETECTED", "WARNING_CLEARED"],
          safe: [],
        };
        
        const allowedTypes = advancedFilterConfig.riskStatus.flatMap(
          (status) => eventTypeMap[status] || []
        );
        
        if (allowedTypes.length > 0) {
          events = events.filter((e) => allowedTypes.includes(e.eventType));
        }
      }

      // Filter by ownership percent range
      if (advancedFilterConfig.ownershipPercentMin !== undefined || 
          advancedFilterConfig.ownershipPercentMax !== undefined) {
        events = events.filter((e) => {
          if (advancedFilterConfig.ownershipPercentMin !== undefined && 
              e.ownershipPercent < advancedFilterConfig.ownershipPercentMin) {
            return false;
          }
          if (advancedFilterConfig.ownershipPercentMax !== undefined && 
              e.ownershipPercent > advancedFilterConfig.ownershipPercentMax) {
            return false;
          }
          return true;
        });
      }

      // Filter by buying velocity range
      if (advancedFilterConfig.buyingVelocityMin !== undefined || 
          advancedFilterConfig.buyingVelocityMax !== undefined) {
        events = events.filter((e) => {
          if (advancedFilterConfig.buyingVelocityMin !== undefined && 
              e.buyingVelocity < advancedFilterConfig.buyingVelocityMin) {
            return false;
          }
          if (advancedFilterConfig.buyingVelocityMax !== undefined && 
              e.buyingVelocity > advancedFilterConfig.buyingVelocityMax) {
            return false;
          }
          return true;
        });
      }
    }

    return events;
  }, [advancedFilterConfig, useAdvancedFilter, adaptiveSettings.isLowPower]);

  const statistics = useMemo(() => {
    const stats = {
      totalBreaches: 0,
      totalWarnings: 0,
      totalResolved: 0,
      totalAcknowledged: 0,
      byJurisdiction: {} as Record<Jurisdiction, number>,
    };

    breachEvents.forEach((event) => {
      if (event.eventType === "BREACH_DETECTED") {
        stats.totalBreaches++;
        stats.byJurisdiction[event.jurisdiction] = (stats.byJurisdiction[event.jurisdiction] || 0) + 1;
      } else if (event.eventType === "WARNING_DETECTED") {
        stats.totalWarnings++;
      } else if (event.eventType === "BREACH_RESOLVED") {
        stats.totalResolved++;
      } else if (event.eventType === "BREACH_ACKNOWLEDGED") {
        stats.totalAcknowledged++;
      }
    });

    return stats;
  }, [breachEvents]);

  const getEventIcon = (eventType: BreachEvent["eventType"]) => {
    switch (eventType) {
      case "BREACH_DETECTED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "WARNING_DETECTED":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "BREACH_RESOLVED":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "BREACH_ACKNOWLEDGED":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "WARNING_CLEARED":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getEventBadge = (eventType: BreachEvent["eventType"]) => {
    switch (eventType) {
      case "BREACH_DETECTED":
        return <Badge variant="danger" className="text-xs">Breach Detected</Badge>;
      case "WARNING_DETECTED":
        return <Badge variant="warning" className="text-xs">Warning</Badge>;
      case "BREACH_RESOLVED":
        return <Badge variant="success" className="text-xs">Resolved</Badge>;
      case "BREACH_ACKNOWLEDGED":
        return <Badge variant="outline" className="text-xs">Acknowledged</Badge>;
      case "WARNING_CLEARED":
        return <Badge variant="success" className="text-xs">Warning Cleared</Badge>;
      default:
        return null;
    }
  };


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Historical Breach Tracking
        </CardTitle>
        <CardDescription>
          View and analyze historical breach events and their lifecycle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Total Breaches</div>
            <div className="text-2xl font-bold text-red-500">{statistics.totalBreaches}</div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Total Warnings</div>
            <div className="text-2xl font-bold text-orange-500">{statistics.totalWarnings}</div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Resolved</div>
            <div className="text-2xl font-bold text-green-500">{statistics.totalResolved}</div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Acknowledged</div>
            <div className="text-2xl font-bold text-blue-500">{statistics.totalAcknowledged}</div>
          </div>
        </div>

        {/* Advanced Filters */}
        <AdvancedFilter
          config={advancedFilterConfig}
          onConfigChange={setAdvancedFilterConfig}
          availableFields={["ticker"]}
          className="mb-4"
        />

        {/* Breach Events List - Virtualized */}
        <VirtualizedBreachEventsList
          events={breachEvents}
          advancedFilterConfig={advancedFilterConfig}
          getEventIcon={getEventIcon}
          getEventBadge={getEventBadge}
          highlightSearchText={highlightSearchText}
        />
      </CardContent>
    </Card>
  );
}

