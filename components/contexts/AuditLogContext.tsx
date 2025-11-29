"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { historicalDataStore } from "@/lib/historical-data-store";

interface AuditLogContextValue {
  entries: string[];
  appendLog: (line: string) => void;
}

const AuditLogContext = createContext<AuditLogContextValue | undefined>(
  undefined
);

// Parse log line to extract components
function parseLogLine(line: string): {
  timestamp: string;
  systemId: string;
  level: "BOOT" | "BREACH" | "BREACH_WORKFLOW" | "SIMULATION" | "SYSTEM" | "INFO";
  message: string;
} {
  const timestampMatch = line.match(/^\[([^\]]+)\]/);
  const allBrackets = line.match(/\[([^\]]+)\]/g);
  const levelMatch = line.match(/\[([A-Z_]+)\]:/);

  const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();
  // Extract system ID from the second bracket group (after timestamp)
  const systemId = allBrackets && allBrackets.length > 1 
    ? allBrackets[1].slice(1, -1) // Remove [ and ] from the match
    : "UNKNOWN";
  const levelMatchValue = levelMatch ? levelMatch[1] : "INFO";
  const validLevels: Array<"BOOT" | "BREACH" | "BREACH_WORKFLOW" | "SIMULATION" | "SYSTEM" | "INFO"> = 
    ["BOOT", "BREACH", "BREACH_WORKFLOW", "SIMULATION", "SYSTEM", "INFO"];
  const level = validLevels.includes(levelMatchValue as any) 
    ? (levelMatchValue as "BOOT" | "BREACH" | "BREACH_WORKFLOW" | "SIMULATION" | "SYSTEM" | "INFO")
    : "INFO";
  const message = line.split("]: ").slice(1).join("]: ") || line;

  return {
    timestamp,
    systemId,
    level,
    message,
  };
}

export const AuditLogProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  // Initialize with empty array to avoid hydration mismatch
  // The initial boot message will be added in useEffect on client side only
  const [entries, setEntries] = useState<string[]>([]);

  // Add initial boot message only on client side to avoid hydration mismatch
  useEffect(() => {
    const now = new Date().toISOString();
    const systemId = "RISK-ENGINE-01";
    const bootMessage = `[${now}] [${systemId}] [BOOT]: Regulatory audit log initialized. Monitoring for breaches and simulations...`;
    setEntries([bootMessage]);
    
    // Persist the boot message
    const parsed = parseLogLine(bootMessage);
    historicalDataStore.recordAuditLogEntry(
      bootMessage,
      parsed.systemId,
      parsed.level,
      parsed.message
    );
  }, []);

  const appendLog = useCallback((line: string) => {
    setEntries((prev) => [...prev, line]);
    
    // Persist to historical data store
    const parsed = parseLogLine(line);
    historicalDataStore.recordAuditLogEntry(
      line,
      parsed.systemId,
      parsed.level,
      parsed.message
    );
  }, []);

  const value: AuditLogContextValue = {
    entries,
    appendLog,
  };

  return (
    <AuditLogContext.Provider value={value}>
      {children}
    </AuditLogContext.Provider>
  );
};

export const useAuditLog = (): AuditLogContextValue => {
  const ctx = useContext(AuditLogContext);
  if (!ctx) {
    throw new Error("useAuditLog must be used within an AuditLogProvider");
  }
  return ctx;
};


