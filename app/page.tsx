"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { usePortfolio } from "@/components/contexts/PortfolioContext";
import { Shield, Calculator, Settings, Info, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DataSource } from "@/components/contexts/RiskContext";
import { useAuditLog } from "@/components/contexts/AuditLogContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRisk, type AggregationScope } from "@/components/contexts/RiskContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LazyErrorBoundary } from "@/components/lazy-error-boundary";

// Safe lazy loader wrapper that handles errors
const safeLazy = (importFn: () => Promise<any>) => {
  if (typeof importFn !== 'function') {
    console.error("safeLazy: importFn must be a function");
    return lazy(() => Promise.resolve({
      default: () => (
        <div className="p-4 border border-yellow-500/20 rounded-lg bg-yellow-500/10 text-yellow-500 text-sm">
          Component failed to load: Invalid import function.
        </div>
      ),
    }));
  }
  
  return lazy(() => {
    try {
      const promise = importFn();
      if (!promise || typeof promise.then !== 'function') {
        throw new Error("Import function did not return a promise");
      }
      return promise.catch((error) => {
        console.error("Failed to load lazy component:", error);
        // Return a fallback component instead of throwing
        return {
          default: () => (
            <div className="p-4 border border-yellow-500/20 rounded-lg bg-yellow-500/10 text-yellow-500 text-sm">
              Component failed to load. Please refresh the page.
            </div>
          ),
        };
      });
    } catch (error) {
      console.error("Failed to create lazy component:", error);
      return Promise.resolve({
        default: () => (
          <div className="p-4 border border-yellow-500/20 rounded-lg bg-yellow-500/10 text-yellow-500 text-sm">
            Component failed to load: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ),
      });
    }
  });
};

// OPTIMIZED: Lazy load ALL heavy components to improve initial load time
// Only load critical UI components synchronously
const RiskHeatmap = safeLazy(() => import("@/components/analytics/risk-heatmap"));
const PredictiveBreachTable = safeLazy(() => import("@/components/compliance/predictive-breach-table"));
const CompliancePanel = safeLazy(() => import("@/components/compliance/compliance-panel"));
const PreTradeSimulator = safeLazy(() => import("@/components/compliance/pre-trade-simulator"));
const SystemStatus = safeLazy(() => import("@/components/system-status"));
const RegulatoryAuditLog = safeLazy(() => import("@/components/compliance/RegulatoryAuditLog"));
const NotificationMonitor = safeLazy(() => import("@/components/notifications/notification-monitor"));
const AdvancedAnalyticsDashboard = safeLazy(() => import("@/components/analytics/advanced-analytics-dashboard"));
const IntegrationSettings = safeLazy(() => import("@/components/admin/IntegrationSettings"));
const TableauRiskDashboard = safeLazy(() => import("@/components/tableau/tableau-risk-dashboard"));
const RealtimeTableauDashboard = safeLazy(() => import("@/components/tableau/realtime-tableau-dashboard"));
const TimeTravelAuditView = safeLazy(() => import("@/components/compliance/TimeTravelAuditView"));
const HistoricalBreachViewer = safeLazy(() => import("@/components/compliance/historical-breach-viewer"));
const TrendAnalysisViewer = safeLazy(() => import("@/components/analytics/trend-analysis-viewer"));
const HistoricalDataStatus = safeLazy(() => import("@/components/analytics/historical-data-status"));
const NotificationManager = safeLazy(() => import("@/components/notifications/notification-manager"));
const ExportManager = safeLazy(() => import("@/components/export-manager"));

export default function Dashboard() {
  const { setSelectedTicker } = usePortfolio();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("--:--:--");
  const { appendLog } = useAuditLog();
  const {
    dataSource,
    setDataSource,
    connectionStatus,
    connectionError,
    productionAdapterType,
    setProductionAdapterType,
    aggregationScope,
    setAggregationScope,
  } = useRisk();

  useEffect(() => {
    // Set once on the client to avoid server/client time mismatch
    setIsClient(true);
    setLastUpdated(new Date().toLocaleTimeString());
    
    // Update time every second
    const interval = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRowClick = (ticker: string) => {
    setSelectedTicker(ticker);
    setIsPanelOpen(true);
  };

  const handleRegionClick = (jurisdiction: string) => {
    // Could filter table by jurisdiction here
    console.log("Region clicked:", jurisdiction);
  };

  const handleOpenSimulator = () => {
    setIsSimulatorOpen(true);
    const timestamp = new Date().toISOString();
    const systemId = "SIM-ENGINE-01";
    const line = `[${timestamp}] [${systemId}] [SIMULATION]: User initiated pre-trade simulation workflow (global).`;
    appendLog(line);
  };

  const handleOpenConfig = () => {
    setIsConfigOpen(true);
  };

  // TEMPORARY: Auto-switch to Finnhub for testing
  // Remove this useEffect after testing or set to false
  useEffect(() => {
    const AUTO_ENABLE_FINNHUB = true; // Set to false to disable auto-switch
    if (AUTO_ENABLE_FINNHUB && dataSource !== "finnhub") {
      console.log("[Test Mode] Auto-switching to Finnhub data source...");
      setDataSource("finnhub");
    }
  }, [dataSource, setDataSource]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Global Regulatory Risk Engine</h1>
                <p className="text-sm text-muted-foreground">
                  Mission-Critical Dashboard for Global Head of Risk
                </p>
                {isClient && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      Active Data Source:{" "}
                      {dataSource === "mock"
                        ? "Internal Simulation (Mock)"
                        : dataSource === "crd"
                        ? "Charles River (FIX Protocol)"
                        : dataSource === "finnhub"
                        ? "Finnhub Real-Time Market Data"
                        : dataSource === "prod-rest"
                        ? "Live Production (REST Gateway)"
                        : "Live Production (WebSocket Stream)"}
                    </span>
                    {dataSource === "finnhub" && connectionStatus === "connected" && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/40 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        🔴 Live Market Data Streaming
                      </span>
                    )}
                    {dataSource === "finnhub" && connectionStatus === "connecting" && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Connecting to Finnhub...
                      </span>
                    )}
                    {dataSource === "mock" && connectionStatus === "connected" && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Real-Time Prices Active
                      </span>
                    )}
                    {connectionStatus === "connected" && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/40">
                        ✓ Connected
                      </span>
                    )}
                    {connectionStatus === "connecting" && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/40">
                        Connecting to Production...
                      </span>
                    )}
                    {connectionStatus === "error" && connectionError && (
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/40">
                        {connectionError}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Data Source Selector */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-card">
                  <span className="text-xs text-muted-foreground font-medium">Data:</span>
                  <Select
                    value={dataSource}
                    onValueChange={(value: DataSource) => setDataSource(value)}
                  >
                    <SelectTrigger className="h-7 w-[180px] text-xs border-0 bg-transparent p-0 focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mock">Mock (Simulated)</SelectItem>
                      <SelectItem value="finnhub">Finnhub (Real-Time)</SelectItem>
                      <SelectItem value="crd">Charles River (FIX)</SelectItem>
                      <SelectItem value="prod-rest">Production REST</SelectItem>
                      <SelectItem value="prod-ws">Production WebSocket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-[10px] text-muted-foreground px-3">
                  {dataSource === "finnhub" 
                    ? "Real-time prices from market data. Buying velocity: Simulated mock data." 
                    : dataSource === "mock"
                    ? "Simulated data for development. Buying velocity: Simulated mock data."
                    : dataSource === "crd"
                    ? "FIX Protocol from Charles River. Buying velocity: Simulated mock data."
                    : "Production data source. Buying velocity: Simulated mock data."}
                </div>
              </div>
              {/* Scope Toggle - Entity Aggregation Engine */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-card">
                  <span className="text-xs text-muted-foreground font-medium">View:</span>
                  <button
                    type="button"
                    onClick={() => setAggregationScope("FUND")}
                    title="Fund Level: Shows individual fund exposures. Each fund's position in a ticker is displayed separately. If multiple funds hold the same ticker, you'll see multiple rows (one per fund)."
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      aggregationScope === "FUND"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Fund Level
                  </button>
                  <span className="text-xs text-muted-foreground">|</span>
                  <button
                    type="button"
                    onClick={() => setAggregationScope("GROUP")}
                    title="Group Level: Shows aggregated exposure across all funds. All funds' positions in the same ticker are summed together. If multiple funds hold the same ticker, you'll see one row with the combined total exposure."
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      aggregationScope === "GROUP"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Group Level
                  </button>
                </div>
                <div className="text-[10px] text-muted-foreground px-3">
                  {aggregationScope === "FUND" 
                    ? "Fund Level: Individual fund exposures shown separately" 
                    : "Group Level: Aggregated exposure across all funds"}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={handleOpenConfig}
                aria-label="Open system configuration"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleOpenSimulator}
                className="gap-2"
                size="sm"
              >
                <Calculator className="w-4 h-4" />
                Run Simulation
              </Button>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p
                  className="text-sm font-mono font-semibold"
                  suppressHydrationWarning
                >
                  {lastUpdated}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Monitor - runs in background */}
      <LazyErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <NotificationMonitor />
        </Suspense>
      </LazyErrorBoundary>

      {/* Buying Velocity Info Card - Explains Production Implementation */}
      <div className="container mx-auto px-6 pt-4">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Buying Velocity: Simulated Mock Data
                  </h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Current Status:</p>
                    <p className="text-xs text-muted-foreground">
                      All buying velocity values shown in this platform are <strong>simulated mock data</strong> for demonstration purposes only.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Production Implementation:</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      In a production deployment at Invesco, buying velocity would be calculated from actual trading data stored in Invesco&apos;s database:
                    </p>
                    <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1.5 ml-2">
                      <li>
                        <strong>Order Flow Data:</strong> Query Invesco&apos;s order management system (OMS) database to retrieve executed buy orders for each security over a rolling time window (e.g., last 1 hour, 4 hours, or 24 hours)
                      </li>
                      <li>
                        <strong>Aggregation:</strong> Sum the total shares purchased across all Invesco funds/entities for each ticker within the time window
                      </li>
                      <li>
                        <strong>Velocity Calculation:</strong> Divide total shares purchased by the time window duration to get shares per hour
                      </li>
                      <li>
                        <strong>Real-Time Updates:</strong> Continuously poll or subscribe to order execution events from Invesco&apos;s trading systems to update buying velocity in real-time
                      </li>
                      <li>
                        <strong>Database Query Example:</strong> 
                        <code className="block mt-1 px-2 py-1 rounded bg-muted/50 text-[10px] font-mono">
                          SELECT ticker, SUM(shares_executed) / hours_elapsed AS buying_velocity<br/>
                          FROM order_executions<br/>
                          WHERE side = &apos;BUY&apos; AND execution_time {'>'} NOW() - INTERVAL &apos;1 hour&apos;<br/>
                          GROUP BY ticker
                        </code>
                      </li>
                    </ol>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[10px] text-muted-foreground">
                      <strong>Note:</strong> This demo platform uses simulated buying velocity values to demonstrate the regulatory risk monitoring capabilities. In production, these values would be sourced directly from Invesco&apos;s trading and portfolio management databases.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-6 space-y-6">
        {/* Risk Heatmap */}
        <div>
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground">Loading heatmap...</div>}>
            <RiskHeatmap onRegionClick={handleRegionClick} />
          </Suspense>
        </div>

        {/* Advanced Analytics Dashboard */}
        <div>
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground">Loading analytics...</div>}>
            <AdvancedAnalyticsDashboard />
          </Suspense>
        </div>

        {/* Tableau Analytics Section - Real-Time Dashboard */}
        <div>
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground">Loading Tableau dashboard...</div>}>
            <RealtimeTableauDashboard />
          </Suspense>
        </div>

        {/* Tableau Analytics Section - Custom Risk Dashboard */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Risk Analytics Dashboard</CardTitle>
              <CardDescription>
                Comprehensive risk analysis and compliance monitoring powered by your platform data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground">Loading analytics...</div>}>
                <TableauRiskDashboard />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Projected Breach Time Logic Explanation */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Projected Breach Time Calculation</CardTitle>
              <CardDescription>
                Understanding how the system predicts regulatory threshold breaches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Calculation Method</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    The projected breach time estimates when a position will exceed its regulatory threshold based on current buying velocity. The calculation uses delta-adjusted exposure, which includes both direct share ownership and derivative positions (options).
                  </p>
                  <div className="bg-muted/50 rounded-md p-4 font-mono text-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">1.</span>
                      <div>
                        <span className="text-muted-foreground">Total Exposure = </span>
                        <span className="text-foreground">Shares Owned + (Sum of: Contracts × 100 × Delta)</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">2.</span>
                      <div>
                        <span className="text-muted-foreground">Threshold Shares = </span>
                        <span className="text-foreground">(Threshold / 100) × Total Shares Outstanding</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">3.</span>
                      <div>
                        <span className="text-muted-foreground">Shares to Breach = </span>
                        <span className="text-foreground">Threshold Shares - Total Exposure</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">4.</span>
                      <div>
                        <span className="text-muted-foreground">Time to Breach (hours) = </span>
                        <span className="text-foreground">Shares to Breach / Buying Velocity (shares/hour)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Status Determination</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">●</span>
                      <div>
                        <span className="font-semibold">Breach:</span>
                        <span className="text-muted-foreground ml-2">Current position already exceeds the regulatory threshold</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">●</span>
                      <div>
                        <span className="font-semibold">Warning:</span>
                        <span className="text-muted-foreground ml-2">Position is at or above 90% of threshold (within warning zone)</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">●</span>
                      <div>
                        <span className="font-semibold">Safe:</span>
                        <span className="text-muted-foreground ml-2">Position is below 90% of threshold (outside warning zone), OR buying velocity is zero or negative</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Edge Cases</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                    <li>If the position is already at or above the threshold, the status is immediately set to &quot;Breach&quot; with no time calculation</li>
                    <li>If buying velocity is zero or negative, the position is marked as &quot;Safe&quot; since no breach is projected (no calculation performed)</li>
                    <li>If the position is below 90% of the threshold, it is marked as &quot;Safe&quot; regardless of buying velocity</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> The calculation uses actual total shares outstanding for each security. Delta-adjusted exposure accounts for derivative positions (options) where each contract represents 100 shares adjusted by the option&apos;s delta value, providing institutional-grade accuracy for regulatory compliance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Predictive Breach Table */}
        <div>
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground">Loading breach table...</div>}>
            <PredictiveBreachTable onRowClick={handleRowClick} />
          </Suspense>
        </div>

        {/* Audit Time-Travel Explorer */}
        <div>
          <Suspense fallback={<div className="h-32 flex items-center justify-center text-muted-foreground">Loading time-travel view...</div>}>
            <TimeTravelAuditView />
          </Suspense>
        </div>

        {/* Historical Data Status */}
        <div>
          <Suspense fallback={<div className="h-24 flex items-center justify-center text-muted-foreground">Loading data status...</div>}>
            <HistoricalDataStatus />
          </Suspense>
        </div>

        {/* Historical Breach Tracking */}
        <div>
          <Suspense fallback={<div className="h-32 flex items-center justify-center text-muted-foreground">Loading breach history...</div>}>
            <HistoricalBreachViewer />
          </Suspense>
        </div>

        {/* Trend Analysis */}
        <div>
          <Suspense fallback={<div className="h-32 flex items-center justify-center text-muted-foreground">Loading trend analysis...</div>}>
            <TrendAnalysisViewer />
          </Suspense>
        </div>

        {/* Notification Manager */}
        <div>
          <Suspense fallback={<div className="h-32 flex items-center justify-center text-muted-foreground">Loading notifications...</div>}>
            <NotificationManager />
          </Suspense>
        </div>

        {/* Export Manager */}
        <div>
          <Suspense fallback={<div className="h-32 flex items-center justify-center text-muted-foreground">Loading export manager...</div>}>
            <ExportManager />
          </Suspense>
        </div>
      </main>

      {/* System Status Footer */}
      <Suspense fallback={null}>
        <RegulatoryAuditLog />
      </Suspense>
      <Suspense fallback={null}>
        <SystemStatus />
      </Suspense>

      {/* Compliance Panel - Only load when opened */}
      {isPanelOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">Loading panel...</div>}>
          <CompliancePanel open={isPanelOpen} onOpenChange={setIsPanelOpen} />
        </Suspense>
      )}

      {/* Pre-Trade Simulator - Only load when opened */}
      {isSimulatorOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">Loading simulator...</div>}>
          <PreTradeSimulator
            open={isSimulatorOpen}
            onOpenChange={setIsSimulatorOpen}
          />
        </Suspense>
      )}

      {/* Enterprise Integration Settings - Only load when opened */}
      {isConfigOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">Loading settings...</div>}>
          <IntegrationSettings open={isConfigOpen} onOpenChange={setIsConfigOpen} />
        </Suspense>
      )}

    </div>
  );
}

