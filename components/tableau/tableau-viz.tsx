"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw, Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTableauUsername, setTableauUsername } from "@/lib/tableau-user";

// TypeScript declarations for the tableau-viz web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "tableau-viz": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          width?: string;
          height?: string;
          device?: "desktop" | "phone" | "tablet";
          toolbar?: "top" | "bottom" | "hidden";
          "hide-tabs"?: boolean;
          "hide-toolbar"?: boolean;
        },
        HTMLElement
      >;
    }
  }
}

interface TableauVizProps {
  src?: string;
  width?: string;
  height?: string;
  device?: "desktop" | "phone" | "tablet";
  toolbar?: "top" | "bottom" | "hidden";
  hideTabs?: boolean;
  hideToolbar?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

// Pre-configured useful Tableau visualizations for regulatory risk management
// Uses environment variables for Tableau Server/Cloud URLs when configured
const getUsefulVisualizations = () => {
  const serverUrl = process.env.NEXT_PUBLIC_TABLEAU_SERVER_URL;
  const siteId = process.env.NEXT_PUBLIC_TABLEAU_SITE_ID;
  const defaultVizUrl = process.env.NEXT_PUBLIC_TABLEAU_DEFAULT_URL;
  
  // Build Tableau Server URLs if configured
  const buildServerUrl = (workbook: string, view: string) => {
    if (!serverUrl) return "";
    const baseUrl = serverUrl.replace(/\/$/, "");
    const sitePath = siteId ? `/site/${siteId}` : "";
    return `${baseUrl}${sitePath}/views/${workbook}/${view}`;
  };

  return [
    {
      name: "Sample: Superstore Sales Dashboard",
      url: "https://public.tableau.com/views/Superstore_24/Overview",
      description: "Interactive Tableau Public example - demonstrates filtering, parameters, and actions",
    },
    {
      name: "Sample: World Indicators",
      url: "https://public.tableau.com/views/WorldIndicators/GDPpercapita",
      description: "Example dashboard showing global economic indicators and trends",
    },
    {
      name: "Default Visualization",
      url: defaultVizUrl || "",
      description: defaultVizUrl ? "Configured default visualization from environment" : "Set NEXT_PUBLIC_TABLEAU_DEFAULT_URL to configure",
    },
    {
      name: "Portfolio Risk Dashboard",
      url: buildServerUrl("PortfolioRisk", "Dashboard") || "",
      description: serverUrl ? "Portfolio risk analysis dashboard from Tableau Server" : "Configure NEXT_PUBLIC_TABLEAU_SERVER_URL to enable",
    },
    {
      name: "Compliance Metrics Over Time",
      url: buildServerUrl("ComplianceMetrics", "Trends") || "",
      description: serverUrl ? "Compliance trends visualization from Tableau Server" : "Configure NEXT_PUBLIC_TABLEAU_SERVER_URL to enable",
    },
    {
      name: "Asset Allocation by Jurisdiction",
      url: buildServerUrl("AssetAllocation", "Jurisdiction") || "",
      description: serverUrl ? "Jurisdiction breakdown visualization from Tableau Server" : "Configure NEXT_PUBLIC_TABLEAU_SERVER_URL to enable",
    },
  ];
};

export default function TableauViz({
  src,
  width = "100%",
  height = "600px",
  device = "desktop",
  toolbar = "bottom",
  hideTabs = false,
  hideToolbar = false,
  title = "Tableau Analytics",
  description = "Interactive data visualization powered by Tableau",
  className = "",
}: TableauVizProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [tableauUsername, setTableauUsernameState] = useState<string>(() => {
    // Initialize from localStorage or environment variable
    if (typeof window !== 'undefined') {
      return getTableauUsername();
    }
    return process.env.NEXT_PUBLIC_TABLEAU_DEFAULT_USERNAME || 'guest';
  });
  
  // Default to a useful sample visualization if no URL is provided
  const defaultUrl =
    src ||
    process.env.NEXT_PUBLIC_TABLEAU_DEFAULT_URL ||
    "https://public.tableau.com/views/Superstore_24/Overview";
  
  const [configSrc, setConfigSrc] = useState(defaultUrl);
  
  // Get useful visualizations (re-evaluated on each render to get latest env vars)
  const USEFUL_VISUALIZATIONS = getUsefulVisualizations();
  
  // Update configSrc when src prop changes
  useEffect(() => {
    if (src) {
      setConfigSrc(src);
    }
  }, [src]);

  // Load JWT token if Connected App is enabled and we're using a Tableau Server URL
  useEffect(() => {
    const loadJwtToken = async () => {
      // Only load token if using Connected App and URL is from Tableau Server
      const useConnectedApp = process.env.NEXT_PUBLIC_TABLEAU_USE_CONNECTED_APP === "true";
      const isServerUrl = configSrc && !configSrc.includes("public.tableau.com");
      
      if (useConnectedApp && isServerUrl && !jwtToken) {
        setIsLoadingToken(true);
        try {
          // Get username from helper function (safe fallbacks)
          const username = getTableauUsername();
          
          const response = await fetch("/api/tableau/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: username,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setJwtToken(data.token);
          } else {
            console.warn("Failed to load JWT token:", await response.text());
          }
        } catch (error) {
          console.error("Error loading JWT token:", error);
        } finally {
          setIsLoadingToken(false);
        }
      }
    };

    loadJwtToken();
  }, [configSrc, jwtToken, tableauUsername]);

  // Automatic token refresh (55 minutes before expiry)
  useEffect(() => {
    if (!jwtToken) return;

    // Refresh token 5 minutes before expiry (55 minutes after creation)
    const refreshTimer = setTimeout(async () => {
      try {
        const username = getTableauUsername();
        const response = await fetch("/api/tableau/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setJwtToken(data.token);
        } else {
          console.warn("Failed to refresh JWT token:", await response.text());
        }
      } catch (error) {
        console.error("Error refreshing JWT token:", error);
      }
    }, 55 * 60 * 1000); // 55 minutes

    return () => clearTimeout(refreshTimer);
  }, [jwtToken]);
  const [configWidth, setConfigWidth] = useState(width);
  const [configHeight, setConfigHeight] = useState(height);
  const [configDevice, setConfigDevice] = useState<"desktop" | "phone" | "tablet">(device);
  const [configToolbar, setConfigToolbar] = useState<"top" | "bottom" | "hidden">(toolbar);
  const [configHideTabs, setConfigHideTabs] = useState(hideTabs);
  const [configHideToolbar, setConfigHideToolbar] = useState(hideToolbar);
  const vizRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Ensure we're in the browser and DOM is ready
    if (typeof window === "undefined" || typeof document === "undefined" || !document.head) {
      return;
    }

    // Load Tableau Embedding API v3 script
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js";
    script.async = true;
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load Tableau Embedding API");
    };

    try {
      if (!document.querySelector(`script[src="${script.src}"]`)) {
        document.head.appendChild(script);
      } else {
        setIsScriptLoaded(true);
      }
    } catch (error) {
      console.error("Error loading Tableau script:", error);
    }

    return () => {
      // Cleanup: script removal is handled by browser
    };
  }, []);

  const handleRefresh = () => {
    if (vizRef.current) {
      // Force reload by updating the src
      const currentSrc = configSrc;
      setConfigSrc("");
      setTimeout(() => {
        setConfigSrc(currentSrc);
      }, 100);
    }
  };

  const handleFullscreen = () => {
    if (vizRef.current) {
      vizRef.current.requestFullscreen?.();
    }
  };

  return (
    <>
      {!isScriptLoaded ? (
        <Card className={className}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading Tableau Embedding API...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !configSrc ? (
        <Card className={className}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsConfigOpen(true);
                }}
                aria-label="Configure Tableau"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <p className="text-sm text-muted-foreground">
                No Tableau visualization URL configured
              </p>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsConfigOpen(true);
                }}
              >
                Configure Tableau
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className={className}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  aria-label="Refresh visualization"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleFullscreen}
                  aria-label="Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsConfigOpen(true);
                  }}
                  aria-label="Configure Tableau"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-hidden rounded-b-lg">
              {isLoadingToken ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center space-y-2">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Authenticating with Tableau...</p>
                  </div>
                </div>
              ) : (
                <tableau-viz
                  ref={vizRef}
                  src={jwtToken ? `${configSrc}?embed_token=${jwtToken}` : configSrc}
                  width={configWidth}
                  height={configHeight}
                  device={configDevice}
                  toolbar={configToolbar}
                  hide-tabs={configHideTabs}
                  hide-toolbar={configHideToolbar}
                  style={{ display: "block", width: "100%" }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog - Always rendered to ensure it works */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tableau Visualization Configuration</DialogTitle>
            <DialogDescription>
              Configure your Tableau visualization settings. You can embed visualizations from
              Tableau Public, Tableau Server, or Tableau Cloud.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="tableau-preset">Quick Select (Optional)</Label>
              <select
                id="tableau-preset"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={(e) => {
                  const selected = getUsefulVisualizations().find((v) => v.name === e.target.value);
                  if (selected && selected.url) {
                    setConfigSrc(selected.url);
                    setJwtToken(null); // Reset token when URL changes to force refresh
                  }
                }}
                defaultValue=""
              >
                <option value="">-- Select a pre-configured visualization --</option>
                {getUsefulVisualizations().map((viz) => (
                  <option key={viz.name} value={viz.name} disabled={!viz.url}>
                    {viz.name} - {viz.description}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Choose a pre-configured visualization or enter a custom URL below.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableau-url">Tableau Visualization URL</Label>
              <Input
                id="tableau-url"
                placeholder="https://public.tableau.com/views/YourWorkbook/YourView"
                value={configSrc}
                onChange={(e) => {
                  setConfigSrc(e.target.value);
                  // Reset token when URL changes to force refresh
                  setJwtToken(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Enter the full URL to your Tableau visualization. For Tableau Server/Cloud, ensure
                proper authentication is configured.
              </p>
            </div>

            {process.env.NEXT_PUBLIC_TABLEAU_USE_CONNECTED_APP === "true" && (
              <div className="space-y-2">
                <Label htmlFor="tableau-username">Tableau Username (Optional)</Label>
                <Input
                  id="tableau-username"
                  placeholder={getTableauUsername()}
                  value={tableauUsername}
                  onChange={(e) => {
                    const username = e.target.value.trim() || process.env.NEXT_PUBLIC_TABLEAU_DEFAULT_USERNAME || 'guest';
                    setTableauUsernameState(username);
                    setTableauUsername(username); // Save to localStorage
                    // Reset token to refresh with new username
                    setJwtToken(null);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Username for Tableau Server authentication. If left empty, uses default from environment variable or &quot;guest&quot;.
                  This is stored in your browser and persists across sessions.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tableau-width">Width</Label>
                <Input
                  id="tableau-width"
                  placeholder="100%"
                  value={configWidth}
                  onChange={(e) => setConfigWidth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableau-height">Height</Label>
                <Input
                  id="tableau-height"
                  placeholder="600px"
                  value={configHeight}
                  onChange={(e) => setConfigHeight(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableau-device">Device Layout</Label>
              <select
                id="tableau-device"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={configDevice}
                onChange={(e) =>
                  setConfigDevice(e.target.value as "desktop" | "phone" | "tablet")
                }
              >
                <option value="desktop">Desktop</option>
                <option value="tablet">Tablet</option>
                <option value="phone">Phone</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableau-toolbar">Toolbar Position</Label>
              <select
                id="tableau-toolbar"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={configToolbar}
                onChange={(e) =>
                  setConfigToolbar(e.target.value as "top" | "bottom" | "hidden")
                }
              >
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="tableau-hide-tabs"
                  checked={configHideTabs}
                  onChange={(e) => setConfigHideTabs(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="tableau-hide-tabs" className="cursor-pointer">
                  Hide Navigation Tabs
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="tableau-hide-toolbar"
                  checked={configHideToolbar}
                  onChange={(e) => setConfigHideToolbar(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="tableau-hide-toolbar" className="cursor-pointer">
                  Hide Toolbar
                </Label>
              </div>
            </div>

            <div className="rounded-md bg-blue-500/10 border border-blue-500/40 p-3">
              <p className="text-sm font-medium text-blue-500 mb-1">Authentication Note</p>
              <p className="text-xs text-muted-foreground">
                For Tableau Server or Tableau Cloud, you may need to configure authentication using
                Connected Apps or External Authorization Servers (EAS) with JWT tokens. Set the
                NEXT_PUBLIC_TABLEAU_SERVER_URL environment variable for server-based
                visualizations.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

