"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings, ExternalLink, Download } from "lucide-react";
import { usePortfolio } from "@/components/contexts/PortfolioContext";
import TableauViz from "./tableau-viz";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Real-time Tableau Dashboard Component
 * 
 * This component:
 * 1. Subscribes to portfolio data changes
 * 2. Updates the Tableau dashboard when data changes
 * 3. Provides options to refresh, configure, and export data
 * 
 * To use this component:
 * 1. Create a Tableau workbook that connects to /api/tableau/data?format=json
 * 2. Publish the workbook to Tableau Server/Cloud or Tableau Public
 * 3. Enter the published workbook URL in the configuration dialog
 */
export default function RealtimeTableauDashboard() {
  const { holdings } = usePortfolio();
  const [tableauUrl, setTableauUrl] = useState<string>("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const vizRef = useRef<any>(null);

  // Update Tableau data cache when holdings change
  useEffect(() => {
    const updateCache = async () => {
      try {
        // Update the server-side cache with current holdings
        await fetch("/api/tableau/data?format=json", {
          method: "GET",
          cache: "no-store",
        });
        
        // If auto-refresh is enabled and we have a Tableau URL, refresh the viz
        if (autoRefresh && tableauUrl && vizRef.current) {
          refreshTableauViz();
        }
      } catch (error) {
        console.error("Error updating Tableau data cache:", error);
      }
    };

    updateCache();
  }, [holdings, autoRefresh, tableauUrl]);

  // Auto-refresh Tableau dashboard every 30 seconds when enabled
  useEffect(() => {
    if (autoRefresh && tableauUrl) {
      refreshIntervalRef.current = setInterval(() => {
        refreshTableauViz();
        setLastRefresh(new Date());
      }, 30000); // 30 seconds
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, tableauUrl]);

  const refreshTableauViz = useCallback(() => {
    if (vizRef.current) {
      // Force Tableau to refresh by updating the src
      // The Tableau Embedding API v3 supports programmatic refresh
      try {
        // Access the Tableau Viz API if available
        const viz = vizRef.current;
        if (viz && typeof viz.refreshAsync === "function") {
          viz.refreshAsync();
        } else {
          // Fallback: trigger a re-render by updating state
          setTableauUrl((prev) => {
            // Add a cache-busting parameter
            const separator = prev.includes("?") ? "&" : "?";
            return `${prev}${separator}_refresh=${Date.now()}`;
          });
        }
      } catch (error) {
        console.error("Error refreshing Tableau viz:", error);
      }
    }
    setLastRefresh(new Date());
  }, []);

  const handleExportData = async () => {
    try {
      const response = await fetch("/api/tableau/data?format=csv");
      const csv = await response.text();
      
      // Download CSV file
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolio-data-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  const handleOpenDataUrl = () => {
    window.open("/api/tableau/data?format=json", "_blank");
  };

  // Load saved Tableau URL from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem("tableau-dashboard-url");
    if (savedUrl) {
      setTableauUrl(savedUrl);
    } else {
      // Default to empty - user needs to configure
      setIsConfigOpen(true);
    }
  }, []);

  // Save Tableau URL to localStorage
  const handleSaveConfig = () => {
    if (tableauUrl) {
      localStorage.setItem("tableau-dashboard-url", tableauUrl);
      setIsConfigOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Real-Time Tableau Analytics Dashboard</CardTitle>
              <CardDescription>
                Interactive dashboard powered by your live portfolio data
                {lastRefresh && (
                  <span className="ml-2 text-xs">
                    (Last refreshed: {lastRefresh.toLocaleTimeString()})
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTableauViz}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenDataUrl}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Data API
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsConfigOpen(true)}
                aria-label="Configure Tableau"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tableauUrl ? (
            <div className="relative">
              <TableauViz
                src={tableauUrl}
                width="100%"
                height="800px"
                title=""
                description=""
              />
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs bg-background/80 backdrop-blur-sm px-2 py-1 rounded border">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-3 h-3"
                  />
                  <span>Auto-refresh (30s)</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 space-y-4 p-8">
              <p className="text-muted-foreground text-center">
                No Tableau dashboard configured. Click the settings button to configure your dashboard.
              </p>
              <Button onClick={() => setIsConfigOpen(true)}>
                Configure Tableau Dashboard
              </Button>
              <div className="mt-4 p-4 bg-muted rounded-lg max-w-2xl">
                <h3 className="font-semibold mb-2">Quick Setup Guide:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Create a Tableau workbook connecting to: <code className="bg-background px-1 rounded">/api/tableau/data?format=json</code></li>
                  <li>Publish the workbook to Tableau Server/Cloud or Tableau Public</li>
                  <li>Enter the published workbook URL in the configuration dialog</li>
                  <li>The dashboard will automatically update when your portfolio data changes</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Tableau Dashboard</DialogTitle>
            <DialogDescription>
              Enter the URL of your published Tableau workbook. The dashboard will connect to your live portfolio data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="tableau-url">Tableau Workbook URL</Label>
              <Input
                id="tableau-url"
                placeholder="https://public.tableau.com/views/YourWorkbook/YourView"
                value={tableauUrl}
                onChange={(e) => setTableauUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the full URL to your published Tableau visualization.
              </p>
            </div>

            <div className="rounded-md bg-blue-500/10 border border-blue-500/40 p-4">
              <h4 className="font-semibold text-sm mb-2">Data Connection Setup</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Your Tableau workbook should connect to this API endpoint:
              </p>
              <code className="block bg-background p-2 rounded text-xs mb-2 break-all">
                {typeof window !== "undefined" 
                  ? `${window.location.origin}/api/tableau/data?format=json`
                  : "/api/tableau/data?format=json"}
              </code>
              <p className="text-xs text-muted-foreground">
                Use a Web Data Connector or JSON data source in Tableau to connect to this endpoint.
                The data updates in real-time as your portfolio changes.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveConfig} disabled={!tableauUrl}>
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

