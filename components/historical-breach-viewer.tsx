"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { historicalDataStore } from "@/lib/historical-data-store";
import type { BreachEvent, Jurisdiction } from "@/types";
import { AlertTriangle, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function HistoricalBreachViewer() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<Jurisdiction | "all">("all");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("24h");

  const breachEvents = useMemo(() => {
    const now = new Date();
    let startTime: string | undefined;
    
    if (timeRange === "1h") {
      startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    } else if (timeRange === "24h") {
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    } else if (timeRange === "7d") {
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (timeRange === "30d") {
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    // "all" time range - no startTime filter

    const query: any = {
      limit: 100,
    };
    
    if (startTime) {
      query.startTime = startTime;
    }

    if (selectedTicker) {
      query.ticker = selectedTicker;
    }
    if (selectedJurisdiction !== "all") {
      query.jurisdiction = selectedJurisdiction;
    }
    if (selectedEventType !== "all") {
      query.eventType = selectedEventType;
    }

    return historicalDataStore.queryBreachEvents(query);
  }, [selectedTicker, selectedJurisdiction, selectedEventType, timeRange]);

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

  // Get unique tickers and jurisdictions from breach events
  const uniqueTickers = useMemo(() => {
    const tickers = new Set(breachEvents.map((e) => e.ticker));
    return Array.from(tickers).sort();
  }, [breachEvents]);

  const uniqueJurisdictions = useMemo(() => {
    const jurisdictions = new Set(breachEvents.map((e) => e.jurisdiction));
    return Array.from(jurisdictions).sort();
  }, [breachEvents]);

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

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-lg bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="time-range" className="text-xs">Time Range</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger id="time-range" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticker-filter" className="text-xs">Ticker</Label>
            <Select
              value={selectedTicker || "all"}
              onValueChange={(value) => setSelectedTicker(value === "all" ? null : value)}
            >
              <SelectTrigger id="ticker-filter" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tickers</SelectItem>
                {uniqueTickers.map((ticker) => (
                  <SelectItem key={ticker} value={ticker}>
                    {ticker}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jurisdiction-filter" className="text-xs">Jurisdiction</Label>
            <Select
              value={selectedJurisdiction}
              onValueChange={(value) => setSelectedJurisdiction(value as Jurisdiction | "all")}
            >
              <SelectTrigger id="jurisdiction-filter" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jurisdictions</SelectItem>
                {uniqueJurisdictions.map((jur) => (
                  <SelectItem key={jur} value={jur}>
                    {jur}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-type-filter" className="text-xs">Event Type</Label>
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger id="event-type-filter" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="BREACH_DETECTED">Breach Detected</SelectItem>
                <SelectItem value="WARNING_DETECTED">Warning Detected</SelectItem>
                <SelectItem value="BREACH_ACKNOWLEDGED">Breach Acknowledged</SelectItem>
                <SelectItem value="BREACH_RESOLVED">Breach Resolved</SelectItem>
                <SelectItem value="WARNING_CLEARED">Warning Cleared</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Breach Events List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {breachEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <div className="text-sm font-medium">No breach events found for the selected filters</div>
              <div className="text-xs">
                Breach events are automatically recorded when breaches are detected, acknowledged, or resolved.
                <br />
                Try adjusting the time range or filters, or wait for breach events to occur.
              </div>
            </div>
          ) : (
            breachEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 border border-border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getEventIcon(event.eventType)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-sm">{event.ticker}</span>
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
                        {event.projectedBreachTime !== null && event.projectedBreachTime !== undefined && (
                          <div>
                            Projected Breach Time: {event.projectedBreachTime.toFixed(1)} hours
                          </div>
                        )}
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

