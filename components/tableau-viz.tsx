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
// Note: Replace these URLs with your own Tableau Server/Cloud visualizations
const USEFUL_VISUALIZATIONS = [
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
    name: "Custom: Portfolio Risk Dashboard",
    url: "",
    description: "Configure your own portfolio risk analysis dashboard URL",
  },
  {
    name: "Custom: Compliance Metrics Over Time",
    url: "",
    description: "Configure your own compliance trends visualization URL",
  },
  {
    name: "Custom: Asset Allocation by Jurisdiction",
    url: "",
    description: "Configure your own jurisdiction breakdown visualization URL",
  },
];

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
  // Default to a useful sample visualization if no URL is provided
  const defaultUrl =
    src ||
    process.env.NEXT_PUBLIC_TABLEAU_DEFAULT_URL ||
    "https://public.tableau.com/views/Superstore_24/Overview";
  
  const [configSrc, setConfigSrc] = useState(defaultUrl);
  
  // Update configSrc when src prop changes
  useEffect(() => {
    if (src) {
      setConfigSrc(src);
    }
  }, [src]);
  const [configWidth, setConfigWidth] = useState(width);
  const [configHeight, setConfigHeight] = useState(height);
  const [configDevice, setConfigDevice] = useState<"desktop" | "phone" | "tablet">(device);
  const [configToolbar, setConfigToolbar] = useState<"top" | "bottom" | "hidden">(toolbar);
  const [configHideTabs, setConfigHideTabs] = useState(hideTabs);
  const [configHideToolbar, setConfigHideToolbar] = useState(hideToolbar);
  const vizRef = useRef<HTMLElement>(null);

  useEffect(() => {
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

    if (!document.querySelector(`script[src="${script.src}"]`)) {
      document.head.appendChild(script);
    } else {
      setIsScriptLoaded(true);
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
              <tableau-viz
                ref={vizRef}
                src={configSrc}
                width={configWidth}
                height={configHeight}
                device={configDevice}
                toolbar={configToolbar}
                hide-tabs={configHideTabs}
                hide-toolbar={configHideToolbar}
                style={{ display: "block", width: "100%" }}
              />
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
                  const selected = USEFUL_VISUALIZATIONS.find((v) => v.name === e.target.value);
                  if (selected && selected.url) {
                    setConfigSrc(selected.url);
                  }
                }}
                defaultValue=""
              >
                <option value="">-- Select a pre-configured visualization --</option>
                {USEFUL_VISUALIZATIONS.map((viz) => (
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
                onChange={(e) => setConfigSrc(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the full URL to your Tableau visualization. For Tableau Server/Cloud, ensure
                proper authentication is configured.
              </p>
            </div>

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

