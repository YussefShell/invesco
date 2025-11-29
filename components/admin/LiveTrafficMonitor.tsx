"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFixTrafficLog } from "@/components/contexts/IntegrationSettingsContext";

interface LiveTrafficMonitorProps {
  isActive: boolean;
}

export function LiveTrafficMonitor({ isActive }: LiveTrafficMonitorProps) {
  const { logs } = useFixTrafficLog();
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          {isActive ? "Streaming FIX messages..." : "FIX Listener disabled"}
        </p>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-3 h-3"
          />
          Auto-scroll
        </label>
      </div>
      <div
        ref={containerRef}
        className="bg-black rounded-md p-4 h-64 overflow-y-auto font-mono text-xs"
        style={{
          fontFamily: "Consolas, 'Courier New', monospace",
        }}
      >
        {logs.length === 0 ? (
          <div className="text-green-400">
            [CRD-FIX-GATEWAY] Waiting for connection...
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className="text-green-400 mb-1 whitespace-pre-wrap break-words"
            >
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

