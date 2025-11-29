"use client";

import { PortfolioProvider } from "@/components/PortfolioContext";
import { AuditLogProvider } from "@/components/AuditLogContext";
import { RiskProvider } from "@/components/RiskContext";
import { HistoricalDataProvider } from "@/components/HistoricalDataContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RiskProvider>
      <AuditLogProvider>
        <PortfolioProvider>
          <HistoricalDataProvider>
            {children}
          </HistoricalDataProvider>
        </PortfolioProvider>
      </AuditLogProvider>
    </RiskProvider>
  );
}

