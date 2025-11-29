"use client";

import { useMemo, useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAuditLog } from "@/components/contexts/AuditLogContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";

function VirtualizedAuditLogList({ filtered }: { filtered: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 30,
    overscan: 10,
  });

  if (filtered.length === 0) {
    return (
      <div className="text-muted-foreground py-4 text-center rounded border border-border bg-muted/40">
        No audit entries match the selected filters.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="overflow-auto rounded border border-border bg-muted/40 px-3 py-2 font-mono text-[11px]"
      style={{ maxHeight: "400px" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
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
            className="whitespace-pre leading-relaxed py-1 border-b border-border/50"
          >
            {filtered[virtualRow.index]}
          </div>
        ))}
      </div>
    </div>
  );
}

function parseTimestamp(line: string): Date | null {
  // Match the first bracket group which should be the ISO-8601 timestamp
  const match = line.match(/^\[([^\]]+)\]/);
  if (!match) return null;
  const ts = match[1];
  const date = new Date(ts);
  return isNaN(date.getTime()) ? null : date;
}

function parseEventType(line: string): string | null {
  // Match event type like [BOOT]:, [BREACH]:, [BREACH_WORKFLOW]:, etc.
  // \w+ matches word characters (letters, digits, underscore)
  const match = line.match(/\[([A-Z_]+)\]:/);
  return match ? match[1] : null;
}

function parseSystemId(line: string): string | null {
  // Match system ID in the second bracket group (after timestamp)
  // Pattern: [RISK-ENGINE-01], [SYSTEM-01], etc.
  // First get all bracket groups with their contents
  const matches = line.match(/\[([^\]]+)\]/g);
  if (!matches || matches.length < 2) return null;
  // The first match is the timestamp, second should be system ID
  // Extract content from the second bracket: remove [ and ]
  const systemId = matches[1].slice(1, -1);
  // Validate it looks like a system ID (contains alphanumeric, hyphens, underscores)
  if (/^[A-Z0-9_-]+$/.test(systemId)) {
    return systemId;
  }
  return null;
}

function parseTicker(line: string): string | null {
  // Try to extract ticker from various log formats
  const tickerMatch = line.match(/([A-Z0-9]+(?:\.[A-Z]+)?(?:-[0-9]+)?)/);
  if (tickerMatch) {
    const potentialTicker = tickerMatch[1];
    // Filter out common non-ticker patterns
    if (!["RISK", "SIM", "ENGINE", "BOOT"].includes(potentialTicker)) {
      return potentialTicker;
    }
  }
  return null;
}

export default function TimeTravelAuditView() {
  const { entries } = useAuditLog();
  const [asOf, setAsOf] = useState<string>("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [systemIdFilter, setSystemIdFilter] = useState<string>("all");
  const [tickerFilter, setTickerFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(true);

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    entries.forEach((line) => {
      const type = parseEventType(line);
      if (type) types.add(type);
    });
    return Array.from(types).sort();
  }, [entries]);

  const systemIds = useMemo(() => {
    const ids = new Set<string>();
    entries.forEach((line) => {
      const id = parseSystemId(line);
      if (id) ids.add(id);
    });
    return Array.from(ids).sort();
  }, [entries]);

  const { filtered, effectiveAsOf } = useMemo(() => {
    let result = entries;

    // Time filter
    if (asOf) {
      const asOfDate = new Date(asOf);
      if (!isNaN(asOfDate.getTime())) {
        result = result.filter((line) => {
          const ts = parseTimestamp(line);
          return !ts || ts <= asOfDate;
        });
      }
    }

    // Event type filter
    if (eventTypeFilter !== "all") {
      result = result.filter((line) => {
        const type = parseEventType(line);
        return type === eventTypeFilter;
      });
    }

    // System ID filter
    if (systemIdFilter !== "all") {
      result = result.filter((line) => {
        const id = parseSystemId(line);
        return id === systemIdFilter;
      });
    }

    // Ticker filter (case-insensitive search)
    if (tickerFilter.trim()) {
      const searchTerm = tickerFilter.trim().toUpperCase();
      result = result.filter((line) => {
        const ticker = parseTicker(line);
        // First try to match parsed ticker, then fall back to searching the full line
        if (ticker && ticker.toUpperCase().includes(searchTerm)) {
          return true;
        }
        // Fallback: search in the full line for the ticker (handles cases like "for NVDA" or "NVDA status")
        return line.toUpperCase().includes(searchTerm);
      });
    }

    const effectiveAsOfDate = asOf ? new Date(asOf) : null;
    if (effectiveAsOfDate && isNaN(effectiveAsOfDate.getTime())) {
      return { filtered: result, effectiveAsOf: null as Date | null };
    }

    return { filtered: result, effectiveAsOf: effectiveAsOfDate };
  }, [asOf, entries, eventTypeFilter, systemIdFilter, tickerFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (asOf) count++;
    if (eventTypeFilter !== "all") count++;
    if (systemIdFilter !== "all") count++;
    if (tickerFilter.trim()) count++;
    return count;
  }, [asOf, eventTypeFilter, systemIdFilter, tickerFilter]);

  const clearFilters = () => {
    setAsOf("");
    setEventTypeFilter("all");
    setSystemIdFilter("all");
    setTickerFilter("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audit Time-Travel View</CardTitle>
            <CardDescription>
              Inspect the regulatory audit log as of a specific point in time.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Badge variant="outline" className="gap-1">
                {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
              </Badge>
            )}
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
      </CardHeader>
      <CardContent className="space-y-4">
        {showFilters && (
          <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* As-of Timestamp */}
              <div className="space-y-2">
                <Label htmlFor="as-of-timestamp" className="text-xs font-medium">
                  As-of Timestamp (ISO-8601)
                </Label>
                <Input
                  id="as-of-timestamp"
                  placeholder="e.g. 2025-11-29T12:00:00Z"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Only events with timestamps ≤ this value will be shown.
                </p>
              </div>

              {/* Event Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="event-type-filter" className="text-xs font-medium">
                  Event Type
                </Label>
                <Select
                  value={eventTypeFilter}
                  onValueChange={setEventTypeFilter}
                >
                  <SelectTrigger id="event-type-filter" className="h-9">
                    <SelectValue placeholder="All Event Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Event Types</SelectItem>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* System ID Filter */}
              <div className="space-y-2">
                <Label htmlFor="system-id-filter" className="text-xs font-medium">
                  System ID
                </Label>
                <Select
                  value={systemIdFilter}
                  onValueChange={setSystemIdFilter}
                >
                  <SelectTrigger id="system-id-filter" className="h-9">
                    <SelectValue placeholder="All Systems" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Systems</SelectItem>
                    {systemIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ticker Search */}
              <div className="space-y-2">
                <Label htmlFor="ticker-search" className="text-xs font-medium">
                  Ticker/Issuer Search
                </Label>
                <Input
                  id="ticker-search"
                  placeholder="e.g. NVDA, AAPL"
                  value={tickerFilter}
                  onChange={(e) => setTickerFilter(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Search for specific tickers or issuers in log entries.
                </p>
              </div>
            </div>
          </div>
        )}

        {effectiveAsOf && (
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold">{filtered.length}</span> event{filtered.length !== 1 ? "s" : ""} as of{" "}
            <span className="font-mono text-xs">
              {effectiveAsOf.toISOString()}
            </span>
            .
          </p>
        )}

        <VirtualizedAuditLogList filtered={filtered} />
      </CardContent>
    </Card>
  );
}


