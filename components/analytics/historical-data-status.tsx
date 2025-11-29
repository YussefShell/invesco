"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHistoricalData } from "@/components/contexts/HistoricalDataContext";
import { Database, Activity } from "lucide-react";

export default function HistoricalDataStatus() {
  const { getStatistics } = useHistoricalData();
  const [stats, setStats] = useState(getStatistics());
  const [isCollecting, setIsCollecting] = useState(true);

  useEffect(() => {
    // Update statistics every 5 seconds
    const interval = setInterval(() => {
      setStats(getStatistics());
      setIsCollecting(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [getStatistics]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Historical Data Status
        </CardTitle>
        <CardDescription>
          In-memory data collection and persistence status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Holding Snapshots</div>
            <div className="text-2xl font-bold">{stats.totalSnapshots}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.oldestSnapshot ? (
                <>Oldest: {new Date(stats.oldestSnapshot).toLocaleTimeString()}</>
              ) : (
                "No data yet"
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Breach Events</div>
            <div className="text-2xl font-bold text-red-500">{stats.totalBreachEvents}</div>
            <div className="text-xs text-muted-foreground mt-1">Tracked events</div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Audit Log Entries</div>
            <div className="text-2xl font-bold text-blue-500">{stats.totalAuditEntries}</div>
            <div className="text-xs text-muted-foreground mt-1">Persisted entries</div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Trend Data Points</div>
            <div className="text-2xl font-bold text-green-500">{stats.totalTrendPoints}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {isCollecting && (
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse" />
                  Collecting...
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg border border-border bg-muted/20">
          <div className="text-xs text-muted-foreground">
            <strong>Collection Schedule:</strong> Snapshots every 60s, Trend points every 5min
          </div>
          {stats.newestSnapshot && (
            <div className="text-xs text-muted-foreground mt-1">
              <strong>Latest:</strong> {new Date(stats.newestSnapshot).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


