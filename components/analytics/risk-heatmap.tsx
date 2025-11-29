"use client";

import { useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { motion } from "framer-motion";
import { usePortfolio } from "@/components/contexts/PortfolioContext";
import { getRegulatoryStatus } from "@/lib/mock-data";
import type { RegulatoryStatus, Jurisdiction, JurisdictionStatus } from "@/types";

const geoUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface RiskHeatmapProps {
  onRegionClick?: (jurisdiction: string) => void;
}

const getStatusColor = (status: RegulatoryStatus): string => {
  switch (status) {
    case "breach":
      return "#ef4444"; // red-500
    case "warning":
      return "#f97316"; // orange-500
    case "safe":
      return "#22c55e"; // green-500
    default:
      return "#6b7280"; // gray-500
  }
};

// Simplified coordinates for major financial centers
const jurisdictionMarkers = [
  { name: "USA", coordinates: [-95.7129, 37.0902] },
  { name: "UK", coordinates: [-3.436, 55.3781] },
  { name: "Hong Kong", coordinates: [114.1694, 22.3193] },
  { name: "APAC", coordinates: [127.7669, 35.9078] }, // South Korea as APAC representative
];

export default function RiskHeatmap({ onRegionClick }: RiskHeatmapProps) {
  const { holdings } = usePortfolio();
  
  // Calculate jurisdiction statuses from real-time holdings
  const jurisdictionStatuses = useMemo((): JurisdictionStatus[] => {
    const jurisdictions: Jurisdiction[] = ["USA", "UK", "Hong Kong", "APAC"];
    const statuses: JurisdictionStatus[] = [];

    jurisdictions.forEach((jurisdiction) => {
      const jurisdictionHoldings = holdings.filter(
        (h) => h.jurisdiction === jurisdiction
      );
      
      const activeBreaches = jurisdictionHoldings.filter((h) => {
        const ownershipPercent = (h.sharesOwned / h.totalSharesOutstanding) * 100;
        const status = getRegulatoryStatus({
          id: h.id,
          issuer: h.issuer,
          isin: h.isin,
          jurisdiction: h.jurisdiction,
          currentPosition: ownershipPercent,
          threshold: h.regulatoryRule.threshold,
          buyingVelocity: h.buyingVelocity,
          regulatoryRule: h.regulatoryRule,
        });
        return status === "breach";
      }).length;
      
      const warnings = jurisdictionHoldings.filter((h) => {
        const ownershipPercent = (h.sharesOwned / h.totalSharesOutstanding) * 100;
        const status = getRegulatoryStatus({
          id: h.id,
          issuer: h.issuer,
          isin: h.isin,
          jurisdiction: h.jurisdiction,
          currentPosition: ownershipPercent,
          threshold: h.regulatoryRule.threshold,
          buyingVelocity: h.buyingVelocity,
          regulatoryRule: h.regulatoryRule,
        });
        return status === "warning";
      }).length;
      
      const safe = jurisdictionHoldings.filter((h) => {
        const ownershipPercent = (h.sharesOwned / h.totalSharesOutstanding) * 100;
        const status = getRegulatoryStatus({
          id: h.id,
          issuer: h.issuer,
          isin: h.isin,
          jurisdiction: h.jurisdiction,
          currentPosition: ownershipPercent,
          threshold: h.regulatoryRule.threshold,
          buyingVelocity: h.buyingVelocity,
          regulatoryRule: h.regulatoryRule,
        });
        return status === "safe";
      }).length;

      // Determine overall status for jurisdiction
      let status: RegulatoryStatus = "safe";
      if (activeBreaches > 0) {
        status = "breach";
      } else if (warnings > 0) {
        status = "warning";
      }

      statuses.push({
        jurisdiction,
        status,
        activeBreaches,
        warnings,
        safe,
      });
    });

    return statuses;
  }, [holdings]);

  const getJurisdictionStatus = (name: string): RegulatoryStatus => {
    const status = jurisdictionStatuses.find((s) => s.jurisdiction === name);
    return status?.status || "safe";
  };

  return (
    <div className="w-full h-[500px] bg-card rounded-lg border border-border p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Regulatory Risk Heatmap</h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span>Active Breach</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span>Drift Warning (&lt;0.5% from threshold)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span>Safe</span>
          </div>
        </div>
      </div>
      <div className="relative w-full h-[400px]">
        <ComposableMap
          projectionConfig={{
            scale: 150,
            center: [0, 20],
          }}
          className="w-full h-full"
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // Determine if this geography matches our jurisdictions
                const geoName = geo.properties.NAME || "";
                let status: RegulatoryStatus = "safe";
                let isRelevant = false;

                // Simple matching logic (in production, use proper country codes)
                if (
                  geoName.includes("United States") ||
                  geoName.includes("USA")
                ) {
                  status = getJurisdictionStatus("USA");
                  isRelevant = true;
                } else if (
                  geoName.includes("United Kingdom") ||
                  geoName.includes("UK")
                ) {
                  status = getJurisdictionStatus("UK");
                  isRelevant = true;
                } else if (geoName.includes("China") || geoName.includes("Hong Kong")) {
                  status = getJurisdictionStatus("Hong Kong");
                  isRelevant = true;
                } else if (
                  geoName.includes("Korea") ||
                  geoName.includes("Japan") ||
                  geoName.includes("Singapore")
                ) {
                  status = getJurisdictionStatus("APAC");
                  isRelevant = true;
                }

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isRelevant ? getStatusColor(status) : "#1e293b"}
                    stroke="#334155"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: {
                        outline: "none",
                        fill: isRelevant
                          ? getStatusColor(status)
                          : "#334155",
                        cursor: isRelevant ? "pointer" : "default",
                      },
                      pressed: { outline: "none" },
                    }}
                    onClick={() => {
                      if (isRelevant && onRegionClick) {
                        if (geoName.includes("United States")) {
                          onRegionClick("USA");
                        } else if (geoName.includes("United Kingdom")) {
                          onRegionClick("UK");
                        } else if (geoName.includes("Hong Kong")) {
                          onRegionClick("Hong Kong");
                        } else if (
                          geoName.includes("Korea") ||
                          geoName.includes("Japan")
                        ) {
                          onRegionClick("APAC");
                        }
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
          {jurisdictionMarkers.map(({ name, coordinates }) => {
            const status = getJurisdictionStatus(name);
            return (
              <Marker key={name} coordinates={coordinates}>
                <motion.circle
                  r={8}
                  fill={getStatusColor(status)}
                  stroke="#fff"
                  strokeWidth={2}
                  initial={{ scale: 1 }}
                  animate={{
                    scale: status === "breach" ? [1, 1.3, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: status === "breach" ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                />
                <text
                  textAnchor="middle"
                  y={-15}
                  className="text-xs fill-foreground font-medium"
                >
                  {name}
                </text>
              </Marker>
            );
          })}
        </ComposableMap>
      </div>
    </div>
  );
}

