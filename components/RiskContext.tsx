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

export type DataSource = "mock" | "prod-rest" | "prod-ws";
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

  const providerRef = useRef<IPortfolioDataProvider | null>(null);

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
    } else if (dataSource === "prod-rest") {
      newProvider = new RestProductionAdapter();
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
        await providerRef.current?.connect();
        if (!cancelled) {
          setConnectionStatus("connected");
        }
      } catch (error: any) {
        if (!cancelled) {
          setConnectionStatus("error");
          setConnectionError(error?.message ?? String(error));
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
    };
  }, [dataSource, productionAdapterType, updateLatency]);

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
    }),
    [
      dataSource,
      connectionStatus,
      connectionError,
      latency,
      productionAdapterType,
      dataProvider,
      aggregationScope,
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


