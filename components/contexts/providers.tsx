"use client";

import React from "react";
import { PortfolioProvider } from "@/components/contexts/PortfolioContext";
import { AuditLogProvider } from "@/components/contexts/AuditLogContext";
import { RiskProvider } from "@/components/contexts/RiskContext";
import { HistoricalDataProvider } from "@/components/contexts/HistoricalDataContext";
import { IntegrationSettingsProvider } from "@/components/contexts/IntegrationSettingsContext";
import { ScheduledReportsSchedulerInit } from "@/components/scheduled-reports-scheduler-init";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RiskProvider>
      <AuditLogProvider>
        <IntegrationSettingsProvider>
          <PortfolioProvider>
            <HistoricalDataProvider>
              <ScheduledReportsSchedulerInit />
              {children}
            </HistoricalDataProvider>
          </PortfolioProvider>
        </IntegrationSettingsProvider>
      </AuditLogProvider>
    </RiskProvider>
  );
}


