"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useAuditLog } from "@/components/contexts/AuditLogContext";
import { useRisk } from "@/components/contexts/RiskContext";

interface FixConfig {
  gatewayHost: string;
  senderCompID: string;
  targetCompID: string;
  sessionType: "Drop Copy" | "Trade Capture";
  websocketUrl: string; // WebSocket URL for FIX protocol connection
}

interface IborConfig {
  endpoint: string;
  authToken: string;
  syncFrequency: "15m" | "1h" | "Daily";
}

interface IntegrationSettingsContextValue {
  fixConfig: FixConfig;
  iborConfig: IborConfig;
  updateFixConfig: (updates: Partial<FixConfig>) => void;
  updateIborConfig: (updates: Partial<IborConfig>) => void;
  isFixEnabled: boolean;
  setIsFixEnabled: (enabled: boolean) => void;
  testIborConnection: () => Promise<void>;
  isTestingConnection: boolean;
  websocketUrl: string; // Expose WebSocket URL for adapter
}

const IntegrationSettingsContext = createContext<
  IntegrationSettingsContextValue | undefined
>(undefined);

// Separate context for FIX traffic logs
interface FixTrafficLogContextValue {
  logs: string[];
  addLog: (log: string) => void;
  clearLogs: () => void;
}

const FixTrafficLogContext = createContext<
  FixTrafficLogContextValue | undefined
>(undefined);

export const IntegrationSettingsProvider: React.FC<
  React.PropsWithChildren
> = ({ children }) => {
  const [fixConfig, setFixConfig] = useState<FixConfig>({
    gatewayHost: "fix.invesco.internal",
    senderCompID: "INVESCO-RISK-ENGINE",
    targetCompID: "CRD-FIX-GATEWAY",
    sessionType: "Drop Copy",
    websocketUrl: "ws://localhost:8080", // Default to Digital Twin, ready for production gateway
  });

  const [iborConfig, setIborConfig] = useState<IborConfig>({
    endpoint: "https://crd-api.invesco.internal/v1/holdings",
    authToken: "",
    syncFrequency: "1h",
  });

  const [isFixEnabled, setIsFixEnabledState] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [fixLogs, setFixLogs] = useState<string[]>([]);
  const { appendLog } = useAuditLog();
  const { setDataSource, registerFixMessageCallback, setWebsocketUrl: setRiskWebsocketUrl } = useRisk();
  const fixIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Define addFixLog before it's used in useEffect
  const addFixLog = useCallback((log: string) => {
    setFixLogs((prev) => {
      const newLogs = [...prev, log];
      // Keep only last 100 logs to prevent memory issues
      return newLogs.slice(-100);
    });
  }, []);

  const updateFixConfig = useCallback((updates: Partial<FixConfig>) => {
    setFixConfig((prev) => {
      const newConfig = { ...prev, ...updates };
      // Update WebSocket URL in RiskContext when it changes
      if (updates.websocketUrl) {
        setRiskWebsocketUrl(updates.websocketUrl);
      }
      return newConfig;
    });
  }, [setRiskWebsocketUrl]);

  const updateIborConfig = useCallback((updates: Partial<IborConfig>) => {
    setIborConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // Register FIX message callback to log to traffic monitor
  useEffect(() => {
    registerFixMessageCallback((rawFix, parsed) => {
      // Format for display (replace SOH with | for readability)
      const displayFix = rawFix.replace(/\x01/g, '|');
      addFixLog(`[CRD-FIX-GATEWAY] 35=${parsed.msgType} | Symbol=${parsed.symbol} | Qty=${parsed.quantity} | Side=${parsed.side} | Price=$${parsed.price.toFixed(2)}`);
      addFixLog(`[CRD-FIX-GATEWAY] Raw: ${displayFix.substring(0, 150)}...`);
    });
  }, [registerFixMessageCallback, addFixLog]);

  const clearFixLogs = useCallback(() => {
    setFixLogs([]);
  }, []);

  const setIsFixEnabled = useCallback(
    (enabled: boolean) => {
      setIsFixEnabledState(enabled);

      if (enabled) {
        // Update WebSocket URL in RiskContext
        setRiskWebsocketUrl(fixConfig.websocketUrl);
        // Switch to CRD data source - the FixProtocolAdapter will handle real FIX parsing
        setDataSource("crd");
        appendLog(
          `[${new Date().toISOString()}] [CRD-FIX-GATEWAY] [SYSTEM]: FIX Listener enabled. Connecting to ${fixConfig.websocketUrl}...`
        );
        addFixLog(
          `[CRD-FIX-GATEWAY] FIX Listener enabled. Connecting to ${fixConfig.websocketUrl}...`
        );
      } else {
        // Switch back to mock
        setDataSource("mock");
        appendLog(
          `[${new Date().toISOString()}] [CRD-FIX-GATEWAY] [SYSTEM]: FIX Listener disabled.`
        );
        addFixLog(`[CRD-FIX-GATEWAY] FIX Listener disabled.`);

        if (fixIntervalRef.current) {
          clearInterval(fixIntervalRef.current);
          fixIntervalRef.current = null;
        }
      }
    },
    [fixConfig.websocketUrl, setDataSource, setRiskWebsocketUrl, appendLog, addFixLog]
  );

  const testIborConnection = useCallback(async () => {
    setIsTestingConnection(true);
    addFixLog(`[CRD-IBOR-API] Testing connection to ${iborConfig.endpoint}...`);

    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const success = Math.random() > 0.2; // 80% success rate for demo

    if (success) {
      addFixLog(`[CRD-IBOR-API] ✓ Connection successful. Authentication verified.`);
      appendLog(
        `[${new Date().toISOString()}] [CRD-IBOR-API] [SYSTEM]: Connection test successful.`
      );
    } else {
      addFixLog(
        `[CRD-IBOR-API] ✗ Connection failed. Check endpoint and authentication token.`
      );
      appendLog(
        `[${new Date().toISOString()}] [CRD-IBOR-API] [SYSTEM]: Connection test failed.`
      );
    }

    setIsTestingConnection(false);
  }, [iborConfig.endpoint, addFixLog, appendLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fixIntervalRef.current) {
        clearInterval(fixIntervalRef.current);
      }
    };
  }, []);

  const settingsValue: IntegrationSettingsContextValue = {
    fixConfig,
    iborConfig,
    updateFixConfig,
    updateIborConfig,
    isFixEnabled,
    setIsFixEnabled,
    testIborConnection,
    isTestingConnection,
    websocketUrl: fixConfig.websocketUrl,
  };

  const logValue: FixTrafficLogContextValue = {
    logs: fixLogs,
    addLog: addFixLog,
    clearLogs: clearFixLogs,
  };

  return (
    <IntegrationSettingsContext.Provider value={settingsValue}>
      <FixTrafficLogContext.Provider value={logValue}>
        {children}
      </FixTrafficLogContext.Provider>
    </IntegrationSettingsContext.Provider>
  );
};

export const useIntegrationSettings = (): IntegrationSettingsContextValue => {
  const ctx = useContext(IntegrationSettingsContext);
  if (!ctx) {
    throw new Error(
      "useIntegrationSettings must be used within an IntegrationSettingsProvider"
    );
  }
  return ctx;
};

export const useFixTrafficLog = (): FixTrafficLogContextValue => {
  const ctx = useContext(FixTrafficLogContext);
  if (!ctx) {
    throw new Error(
      "useFixTrafficLog must be used within an IntegrationSettingsProvider"
    );
  }
  return ctx;
};

