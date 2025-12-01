"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { IPortfolioDataProvider } from "@/lib/types/IDataProvider";
import { MockAdapter } from "@/lib/adapters/MockAdapter";
import { RestProductionAdapter } from "@/lib/adapters/RestProductionAdapter";
import { WebSocketProductionAdapter } from "@/lib/adapters/WebSocketProductionAdapter";
import { FixProtocolAdapter, type ParsedFixMessage } from "@/lib/adapters/FixProtocolAdapter";
import { RealMarketAdapter } from "@/lib/adapters/RealMarketAdapter";

export type DataSource = "mock" | "prod-rest" | "prod-ws" | "crd" | "finnhub";
export type ProductionAdapterType = "rest" | "websocket";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
export type AggregationScope = "FUND" | "GROUP";

interface RiskContextValue {
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  latency: number | null;
  productionAdapterType: ProductionAdapterType;
  setProductionAdapterType: (type: ProductionAdapterType) => void;
  dataProvider: IPortfolioDataProvider | null;
  aggregationScope: AggregationScope;
  setAggregationScope: (scope: AggregationScope) => void;
  registerFixMessageCallback: (callback: (rawFix: string, parsed: ParsedFixMessage) => void) => void;
  websocketUrl: string;
  setWebsocketUrl: (url: string) => void;
}

const RiskContext = createContext<RiskContextValue | undefined>(undefined);

export const RiskProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [dataSource, setDataSource] = useState<DataSource>("mock");
  const [productionAdapterType, setProductionAdapterType] =
    useState<ProductionAdapterType>("rest");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(12);
  const [dataProvider, setDataProvider] = useState<IPortfolioDataProvider | null>(null);
  const [aggregationScope, setAggregationScope] = useState<AggregationScope>("FUND");
  const fixMessageCallbackRef = useRef<
    ((rawFix: string, parsed: ParsedFixMessage) => void) | null
  >(null);
  const [websocketUrl, setWebsocketUrl] = useState<string>("ws://localhost:8080");

  const providerRef = useRef<IPortfolioDataProvider | null>(null);

  // Expose method to register FIX message callback
  const registerFixMessageCallback = useCallback(
    (callback: (rawFix: string, parsed: ParsedFixMessage) => void) => {
      fixMessageCallbackRef.current = callback;
    },
    []
  );

  const updateLatency = useCallback((ms: number) => {
    setLatency(ms);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Dispose any previous adapter (so mock timers and WebSocket connections are cleaned up)
    const current = providerRef.current as any;
    if (current && typeof current.dispose === "function") {
      current.dispose();
    }

    setConnectionStatus("connecting");
    setConnectionError(null);

    let newProvider: IPortfolioDataProvider;
    
    if (dataSource === "mock") {
      newProvider = new MockAdapter(updateLatency);
    } else if (dataSource === "crd") {
      // REAL FIX Protocol Adapter - connects to WebSocket and parses raw FIX 4.4 messages
      newProvider = new FixProtocolAdapter(
        websocketUrl,
        (rawFix, parsed) => {
          // Log to console
          console.log("[FIX-Adapter] Raw FIX:", rawFix.substring(0, 200) + "...");
          console.log("[FIX-Adapter] Parsed:", parsed);
          
          // Call registered callback (for traffic monitor) using ref to avoid stale closure
          if (fixMessageCallbackRef.current) {
            fixMessageCallbackRef.current(rawFix, parsed);
          }
        }
      );
    } else if (dataSource === "prod-rest") {
      newProvider = new RestProductionAdapter();
    } else if (dataSource === "finnhub") {
      // Real Market Data Adapter - uses Finnhub WebSocket for live prices
      // Hybrid model: Real prices + simulated positions
      const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
      
      // Debug: Log API key status (only in development, first 4 chars for security)
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        if (apiKey) {
          console.log('[RiskContext] Finnhub API key found:', apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4));
        } else {
          console.error('[RiskContext] NEXT_PUBLIC_FINNHUB_API_KEY is not set!');
          console.error('[RiskContext] Please check your .env.local file and restart the dev server.');
          console.error('[RiskContext] Current env keys:', Object.keys(process.env).filter(k => k.includes('FINNHUB')));
        }
      }
      
      newProvider = new RealMarketAdapter(apiKey);
    } else {
      // For WebSocket, you can configure the URL and auth token here
      // In a real app, these would come from env vars or a config service
      newProvider = new WebSocketProductionAdapter({
        wsBaseUrl:
          process.env.NEXT_PUBLIC_WS_BASE_URL ||
          "wss://your-gateway.example.com/market-stream",
        authToken: process.env.NEXT_PUBLIC_WS_AUTH_TOKEN,
      });
    }
    
    providerRef.current = newProvider;
    setDataProvider(newProvider);

    const connect = async () => {
      try {
        if (!providerRef.current) {
          throw new Error("Data provider not initialized");
        }
        
        const connected = await providerRef.current.connect();
        if (!cancelled) {
          if (connected === false) {
            // Graceful failure (e.g., missing API key)
            setConnectionStatus("error");
            setConnectionError("Finnhub API key is required. Set NEXT_PUBLIC_FINNHUB_API_KEY environment variable.");
          } else {
            setConnectionStatus("connected");
            setConnectionError(null);
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          setConnectionStatus("error");
          const errorMessage = error?.message ?? String(error);
          setConnectionError(errorMessage);
          console.error("[RiskContext] Connection error:", errorMessage);
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
    };
  }, [dataSource, productionAdapterType, updateLatency, websocketUrl]);

  const value: RiskContextValue = useMemo(
    () => ({
      dataSource,
      setDataSource,
      connectionStatus,
      connectionError,
      latency,
      productionAdapterType,
      setProductionAdapterType,
      dataProvider,
      aggregationScope,
      setAggregationScope,
      registerFixMessageCallback,
      websocketUrl,
      setWebsocketUrl,
    }),
    [
      dataSource,
      connectionStatus,
      connectionError,
      latency,
      productionAdapterType,
      dataProvider,
      aggregationScope,
      registerFixMessageCallback,
      websocketUrl,
    ]
  );

  return <RiskContext.Provider value={value}>{children}</RiskContext.Provider>;
};

export const useRisk = (): RiskContextValue => {
  const ctx = useContext(RiskContext);
  if (!ctx) {
    throw new Error("useRisk must be used within a RiskProvider");
  }
  return ctx;
};


