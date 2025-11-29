"use client";

import { usePortfolio } from "@/components/contexts/PortfolioContext";
import { useRiskCalculator } from "@/lib/use-risk-calculator";
import { formatDurationFromHours } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function DemoDevtoolsSidebar() {
  const {
    holdings,
    selectedTicker,
    setSelectedTicker,
    updateHolding,
    simulateMarketPriceDrop,
    setSimulateMarketPriceDrop,
  } = usePortfolio();

  const activeHolding =
    holdings.find((h) => h.ticker === selectedTicker) ?? holdings[0];
  const { breach, ownershipPercent } = useRiskCalculator(
    activeHolding?.ticker ?? null
  );

  if (!activeHolding || !breach || ownershipPercent == null) return null;

  return (
    <aside
      className={cn(
        "fixed right-4 top-24 z-30 w-80 rounded-lg border border-border bg-card/90 backdrop-blur-md shadow-lg",
        "p-4 space-y-4 text-sm"
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Demo God Control Panel
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          Live
        </span>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Focus Ticker</label>
        <select
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={activeHolding.ticker}
          onChange={(e) => setSelectedTicker(e.target.value)}
        >
          {holdings.map((h) => (
            <option key={h.id} value={h.ticker}>
              {h.ticker} — {h.issuer}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Current Buy Velocity</span>
          <span className="font-mono text-[10px]">
            {activeHolding.buyingVelocity.toLocaleString()} sh/hr
          </span>
        </label>
        <input
          type="range"
          min={0}
          max={50000}
          step={500}
          value={activeHolding.buyingVelocity}
          onChange={(e) =>
            updateHolding(activeHolding.ticker, {
              buyingVelocity: Number(e.target.value),
            })
          }
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          Switch Jurisdiction
        </label>
        <select
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={activeHolding.jurisdiction}
          onChange={(e) =>
            updateHolding(activeHolding.ticker, {
              jurisdiction: e.target.value as any,
            })
          }
        >
          <option value="USA">USA</option>
          <option value="UK">UK</option>
          <option value="Hong Kong">Hong Kong</option>
          <option value="APAC">APAC</option>
        </select>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Simulate Market Price Drop</span>
        <button
          onClick={() => setSimulateMarketPriceDrop(!simulateMarketPriceDrop)}
          className={cn(
            "inline-flex h-6 w-10 items-center rounded-full border border-input px-1 transition-colors",
            simulateMarketPriceDrop ? "bg-emerald-500/60" : "bg-background"
          )}
        >
          <span
            className={cn(
              "h-4 w-4 rounded-full bg-card shadow transition-transform",
              simulateMarketPriceDrop ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
      </div>

      <div className="mt-2 rounded-md border border-border bg-background/60 px-3 py-2 text-[11px] space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Live Ownership</span>
          <span className="font-mono font-semibold">
            {ownershipPercent.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Projected Breach</span>
          <span className="font-mono font-semibold">
            {breach.projectedBreachTime === null
              ? "Safe"
              : formatDurationFromHours(breach.projectedBreachTime)}
          </span>
        </div>
      </div>
    </aside>
  );
}


