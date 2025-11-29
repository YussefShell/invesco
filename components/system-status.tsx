"use client";

import { motion } from "framer-motion";
import { Activity, Wifi, Database } from "lucide-react";
import { useRisk } from "@/components/RiskContext";

export default function SystemStatus() {
  const { connectionStatus, latency, dataSource } = useRisk();

  const isHealthy = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting";

  const apiLabel =
    connectionStatus === "error"
      ? "Down"
      : isConnecting
      ? "Connecting..."
      : "Stable";

  const apiColor =
    connectionStatus === "error"
      ? "text-red-500"
      : isConnecting
      ? "text-yellow-500"
      : "text-green-500";

  const feedLabel =
    connectionStatus === "error"
      ? "Inactive"
      : isConnecting
      ? "Negotiating"
      : "Active";

  return (
    <div className="w-full border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Activity
                  className={`w-4 h-4 ${
                    connectionStatus === "error"
                      ? "text-red-500"
                      : isConnecting
                      ? "text-yellow-500"
                      : "text-green-500"
                  }`}
                />
              </motion.div>
              <span className="text-muted-foreground">API Connection:</span>
              <span className={`font-semibold ${apiColor}`}>{apiLabel}</span>
            </div>

            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-500" />
              <span className="text-muted-foreground">Latency:</span>
              <span className="font-mono font-semibold text-blue-500">
                {latency ?? "--"}ms
              </span>
            </div>

            <div className="flex items-center gap-2">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Database
                  className={`w-4 h-4 ${
                    isHealthy ? "text-green-500" : "text-yellow-500"
                  }`}
                />
              </motion.div>
              <span className="text-muted-foreground">Global Feed:</span>
              <span
                className={`font-semibold ${
                  isHealthy ? "text-green-500" : "text-yellow-500"
                }`}
              >
                {feedLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono">
              Source:{" "}
              {dataSource === "mock"
                ? "Internal Simulation (Mock)"
                : dataSource === "prod-rest"
                ? "Live Production (REST)"
                : "Live Production (WebSocket)"}
            </span>
            <motion.div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "error"
                  ? "bg-red-500"
                  : isConnecting
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              animate={{
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span>{isHealthy ? "Live" : isConnecting ? "Connecting" : "Error"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

