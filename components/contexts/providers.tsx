"use client";

import React from "react";
import { PortfolioProvider } from "@/components/contexts/PortfolioContext";
import { AuditLogProvider } from "@/components/contexts/AuditLogContext";
import { RiskProvider } from "@/components/contexts/RiskContext";
import { HistoricalDataProvider } from "@/components/contexts/HistoricalDataContext";
import { IntegrationSettingsProvider } from "@/components/contexts/IntegrationSettingsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RiskProvider>
      <AuditLogProvider>
        <IntegrationSettingsProvider>
          <PortfolioProvider>
            <HistoricalDataProvider>
              {children}
            </HistoricalDataProvider>
          </PortfolioProvider>
        </IntegrationSettingsProvider>
      </AuditLogProvider>
    </RiskProvider>
  );
}


