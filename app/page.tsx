"use client";

import { useEffect, useState } from "react";
import RiskHeatmap from "@/components/risk-heatmap";
import PredictiveBreachTable from "@/components/predictive-breach-table";
import CompliancePanel from "@/components/compliance-panel";
import PreTradeSimulator from "@/components/pre-trade-simulator";
import SystemStatus from "@/components/system-status";
import { usePortfolio } from "@/components/PortfolioContext";
import { Shield, Calculator, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import RegulatoryAuditLog from "@/components/RegulatoryAuditLog";
import { useAuditLog } from "@/components/AuditLogContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRisk } from "@/components/RiskContext";
import TableauRiskDashboard from "@/components/tableau-risk-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TimeTravelAuditView from "@/components/TimeTravelAuditView";
import HistoricalBreachViewer from "@/components/historical-breach-viewer";
import TrendAnalysisViewer from "@/components/trend-analysis-viewer";
import HistoricalDataStatus from "@/components/historical-data-status";
import NotificationManager from "@/components/notification-manager";
import ExportManager from "@/components/export-manager";
import { NotificationMonitor } from "@/components/notification-monitor";

export default function Dashboard() {
  const { setSelectedTicker } = usePortfolio();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { appendLog } = useAuditLog();
  const {
    dataSource,
    setDataSource,
    connectionStatus,
    connectionError,
    productionAdapterType,
    setProductionAdapterType,
  } = useRisk();

  useEffect(() => {
    // Set once on the client to avoid server/client time mismatch
    setLastUpdated(new Date().toLocaleTimeString());
    setIsClient(true);
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
                        : dataSource === "prod-rest"
                        ? "Live Production (REST Gateway)"
                        : "Live Production (WebSocket Stream)"}
                    </span>
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
                  {lastUpdated ?? "--:--:--"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Monitor - runs in background */}
      <NotificationMonitor />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-6 space-y-6">
        {/* Risk Heatmap */}
        <div>
          <RiskHeatmap onRegionClick={handleRegionClick} />
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
              <TableauRiskDashboard />
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
                    The projected breach time estimates when a position will exceed its regulatory threshold based on current buying velocity.
                  </p>
                  <div className="bg-muted/50 rounded-md p-4 font-mono text-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">1.</span>
                      <div>
                        <span className="text-muted-foreground">Remaining to Threshold = </span>
                        <span className="text-foreground">Threshold - Current Position (%)</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">2.</span>
                      <div>
                        <span className="text-muted-foreground">Shares to Breach = </span>
                        <span className="text-foreground">(Remaining to Threshold / 100) × Estimated Shares per 1%</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">3.</span>
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
                        <span className="text-muted-foreground ml-2">Position is within 0.5% of threshold OR breach projected within 24 hours</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">●</span>
                      <div>
                        <span className="font-semibold">Safe:</span>
                        <span className="text-muted-foreground ml-2">Position is below threshold and no breach projected within 24 hours, OR buying velocity is zero or negative</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Edge Cases</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                    <li>If the position is already at or above the threshold, the status is immediately set to &quot;Breach&quot; with no time calculation</li>
                    <li>If buying velocity is zero or negative, the position is marked as &quot;Safe&quot; since no breach is projected</li>
                    <li>If the calculated time exceeds 1000 hours, the position is considered &quot;Safe&quot; for practical purposes</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> The calculation uses estimated shares per percentage point. In production, this would be dynamically calculated based on market capitalization and total shares outstanding for each security.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Predictive Breach Table */}
        <div>
          <PredictiveBreachTable onRowClick={handleRowClick} />
        </div>

        {/* Audit Time-Travel Explorer */}
        <div>
          <TimeTravelAuditView />
        </div>

        {/* Historical Data Status */}
        <div>
          <HistoricalDataStatus />
        </div>

        {/* Historical Breach Tracking */}
        <div>
          <HistoricalBreachViewer />
        </div>

        {/* Trend Analysis */}
        <div>
          <TrendAnalysisViewer />
        </div>

        {/* Notification Manager */}
        <div>
          <NotificationManager />
        </div>

        {/* Export Manager */}
        <div>
          <ExportManager />
        </div>
      </main>

      {/* System Status Footer */}
      <RegulatoryAuditLog />
      <SystemStatus />

      {/* Compliance Panel */}
      <CompliancePanel open={isPanelOpen} onOpenChange={setIsPanelOpen} />

      {/* Pre-Trade Simulator */}
      <PreTradeSimulator
        open={isSimulatorOpen}
        onOpenChange={setIsSimulatorOpen}
      />

      {/* System Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>System Configuration</DialogTitle>
            <DialogDescription>
              Switch between internal simulation mode and external production
              integration. The UI remains fully decoupled from the underlying
              data source.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Active Data Source</p>
              <p className="text-xs text-muted-foreground">
                Choose which adapter powers the portfolio and risk engine.
              </p>
              <div className="mt-2 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setDataSource("mock")}
                  className={`text-left border rounded-md px-3 py-2 text-sm transition-colors ${
                    dataSource === "mock"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/60"
                  }`}
                >
                  <div className="font-semibold">
                    Internal Simulation (Mock)
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Runs entirely in-browser with randomized data to safely demo
                    the workflow.
                  </div>
                </button>

                <div className="border rounded-md p-3 space-y-3">
                  <div className="font-semibold text-sm">
                    Live Production (Enterprise Gateway)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Connects to server-side API routes that proxy to your REST/gRPC
                    gateway or FIX/Kafka bridge. Configure endpoints via environment
                    variables.
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium">Production Adapter Type:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProductionAdapterType("rest");
                          setDataSource("prod-rest");
                        }}
                        className={`text-left border rounded-md px-3 py-2 text-xs transition-colors ${
                          dataSource === "prod-rest"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <div className="font-semibold">REST (Polling)</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Uses Next.js API routes → REST/gRPC gateway
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProductionAdapterType("websocket");
                          setDataSource("prod-ws");
                        }}
                        className={`text-left border rounded-md px-3 py-2 text-xs transition-colors ${
                          dataSource === "prod-ws"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <div className="font-semibold">WebSocket (Streaming)</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Real-time streaming via WebSocket gateway
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {connectionStatus === "error" && connectionError && (
              <div className="rounded-md bg-red-500/10 border border-red-500/40 p-3">
                <p className="text-sm font-medium text-red-500 mb-1">
                  Connection Error
                </p>
                <p className="text-xs text-red-500/80 font-mono">
                  {connectionError}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {dataSource === "prod-rest"
                    ? "Ensure MARKET_DATA_BASE_URL and REG_CONFIG_BASE_URL are set in your environment variables. For development, switch to 'Mock' data source to avoid this error."
                    : "Ensure NEXT_PUBLIC_WS_BASE_URL is configured and the WebSocket gateway is accessible. For development, switch to 'Mock' data source to avoid this error."}
                </p>
              </div>
            )}

            {connectionStatus === "connected" && (
              <div className="rounded-md bg-green-500/10 border border-green-500/40 p-3">
                <p className="text-sm font-medium text-green-500">
                  ✓ Successfully connected to production gateway
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  The adapter is now receiving live data from your configured
                  endpoint.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

