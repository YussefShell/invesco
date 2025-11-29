"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useIntegrationSettings } from "@/components/contexts/IntegrationSettingsContext";
import { LiveTrafficMonitor } from "./LiveTrafficMonitor";
import { Settings2, Activity, Database, Wifi, Info, ChevronDown, ChevronUp } from "lucide-react";

interface IntegrationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationSettings({ open, onOpenChange }: IntegrationSettingsProps) {
  const {
    fixConfig,
    iborConfig,
    updateFixConfig,
    updateIborConfig,
    isFixEnabled,
    setIsFixEnabled,
    testIborConnection,
    isTestingConnection,
  } = useIntegrationSettings();
  
  const [showProductionInfo, setShowProductionInfo] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Enterprise Integration Settings
          </DialogTitle>
          <DialogDescription>
            Configure Charles River Development (CRD) connectivity standards for
            Plug and Play deployment at Invesco. This is a <strong>real FIX protocol implementation</strong> that
            parses raw FIX 4.4 messages with SOH delimiters, not a simulation.
          </DialogDescription>
        </DialogHeader>
        
        {/* Production Readiness Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <button
            onClick={() => setShowProductionInfo(!showProductionInfo)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
              <Info className="w-4 h-4" />
              Production Readiness Information
            </div>
            {showProductionInfo ? (
              <ChevronUp className="w-4 h-4 text-blue-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-blue-600" />
            )}
          </button>
          {showProductionInfo && (
            <div className="mt-3 space-y-2 text-xs text-blue-800 dark:text-blue-200">
              <p className="font-semibold">✅ What&apos;s Production-Ready:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Real FIX 4.4 protocol parsing with SOH delimiters (\x01)</li>
                <li>Tag extraction (35=MsgType, 55=Symbol, 54=Side, 38=Qty, 44=Price)</li>
                <li>Checksum validation (Tag 10)</li>
                <li>WebSocket connection with auto-reconnection</li>
                <li>Real-time Execution Report processing</li>
              </ul>
              <p className="font-semibold mt-3">🔧 For Production Deployment:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Add TLS/SSL (wss://) and authentication</li>
                <li>Implement message sequence tracking and duplicate detection</li>
                <li>Add comprehensive error handling and circuit breakers</li>
                <li>Set up monitoring, metrics, and alerting</li>
                <li>Implement data persistence and audit logging</li>
                <li>Add load testing and performance optimization</li>
              </ul>
              <p className="mt-2 text-blue-700 dark:text-blue-300">
                See <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">PRODUCTION_READINESS.md</code> for complete checklist.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6 mt-4">
          {/* Section A: Real-Time Velocity (FIX Protocol) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-blue-500" />
                Section A: Real-Time Velocity (FIX Protocol)
              </CardTitle>
              <CardDescription>
                Configure FIX Gateway connection for real-time trade execution
                reports from Charles River. The adapter connects via WebSocket and parses
                raw FIX 4.4 protocol messages with SOH delimiters (\x01), extracts tags
                (35=MsgType, 55=Symbol, 54=Side, 38=Qty, 44=Price), and validates checksums.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="fix-enabled" className="text-base font-semibold">
                    Enable FIX Listener
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Start receiving FIX Execution Reports from CRD gateway. When enabled, the dashboard
                    switches from mock data to real FIX protocol parsing.
                  </p>
                </div>
                <Switch
                  id="fix-enabled"
                  checked={isFixEnabled}
                  onCheckedChange={setIsFixEnabled}
                />
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="fix-websocket-url">WebSocket URL</Label>
                <Input
                  id="fix-websocket-url"
                  placeholder="ws://localhost:8080"
                  value={fixConfig.websocketUrl}
                  onChange={(e) =>
                    updateFixConfig({ websocketUrl: e.target.value })
                  }
                  disabled={!isFixEnabled}
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <strong>Development:</strong> ws://localhost:8080 (Digital Twin server - run `npm run fix-server`)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Production:</strong> ws://fix-gateway.invesco.internal (or your internal FIX gateway endpoint)
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                    <strong>How it works:</strong> When enabled, the dashboard connects to this WebSocket URL and receives
                    raw FIX 4.4 Execution Reports. Each message is parsed byte-by-byte using SOH (\x01) delimiters,
                    tags are extracted, checksums are validated, and trade data drives the Velocity Engine for
                    real-time risk calculations.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="fix-gateway-host">FIX Gateway Host</Label>
                  <Input
                    id="fix-gateway-host"
                    placeholder="fix.invesco.internal"
                    value={fixConfig.gatewayHost}
                    onChange={(e) =>
                      updateFixConfig({ gatewayHost: e.target.value })
                    }
                    disabled={!isFixEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fix-sender-comp-id">SenderCompID</Label>
                  <Input
                    id="fix-sender-comp-id"
                    placeholder="INVESCO-RISK-ENGINE"
                    value={fixConfig.senderCompID}
                    onChange={(e) =>
                      updateFixConfig({ senderCompID: e.target.value })
                    }
                    disabled={!isFixEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fix-target-comp-id">TargetCompID</Label>
                  <Input
                    id="fix-target-comp-id"
                    placeholder="CRD-FIX-GATEWAY"
                    value={fixConfig.targetCompID}
                    onChange={(e) =>
                      updateFixConfig({ targetCompID: e.target.value })
                    }
                    disabled={!isFixEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fix-session-type">Session Type</Label>
                  <Select
                    value={fixConfig.sessionType}
                    onValueChange={(value: "Drop Copy" | "Trade Capture") =>
                      updateFixConfig({ sessionType: value })
                    }
                    disabled={!isFixEnabled}
                  >
                    <SelectTrigger id="fix-session-type">
                      <SelectValue placeholder="Select session type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Drop Copy">Drop Copy</SelectItem>
                      <SelectItem value="Trade Capture">Trade Capture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section B: Holdings Sync (IBOR API) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5 text-green-500" />
                Section B: Holdings Sync (IBOR API)
              </CardTitle>
              <CardDescription>
                Configure Investment Book of Record (IBOR) API for periodic
                holdings synchronization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ibor-endpoint">CRD REST Endpoint</Label>
                  <Input
                    id="ibor-endpoint"
                    placeholder="https://crd-api.invesco.internal/v1/holdings"
                    value={iborConfig.endpoint}
                    onChange={(e) =>
                      updateIborConfig({ endpoint: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ibor-auth-token">Auth Token</Label>
                  <Input
                    id="ibor-auth-token"
                    type="password"
                    placeholder="Bearer token or API key"
                    value={iborConfig.authToken}
                    onChange={(e) =>
                      updateIborConfig({ authToken: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ibor-sync-frequency">Sync Frequency</Label>
                  <Select
                    value={iborConfig.syncFrequency}
                    onValueChange={(value: "15m" | "1h" | "Daily") =>
                      updateIborConfig({ syncFrequency: value })
                    }
                  >
                    <SelectTrigger id="ibor-sync-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15m">Every 15 minutes</SelectItem>
                      <SelectItem value="1h">Every hour</SelectItem>
                      <SelectItem value="Daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={testIborConnection}
                    disabled={isTestingConnection || !iborConfig.endpoint}
                    className="w-full"
                    variant="outline"
                  >
                    {isTestingConnection ? (
                      <>
                        <Wifi className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Wifi className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Traffic Monitor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-amber-500" />
                Live Traffic Monitor
              </CardTitle>
              <CardDescription>
                Real-time FIX protocol message stream from Charles River gateway. Shows parsed Execution Reports
                (MsgType=8) with extracted tags: Symbol (55), Side (54), Quantity (38), Price (44). Raw FIX messages
                use SOH delimiters (\x01) which are displayed as | for readability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LiveTrafficMonitor isActive={isFixEnabled} />
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Default export for lazy loading
export default IntegrationSettings;

