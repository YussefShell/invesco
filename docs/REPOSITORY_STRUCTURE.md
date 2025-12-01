# Repository Structure

This document describes the organized structure of the Invesco Regulatory Risk Management System repository.

## Directory Structure

```
InvescoProject2/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── exports/             # Export job endpoints
│   │   ├── health/              # Health check endpoint
│   │   ├── market-data/         # Market data endpoints
│   │   ├── notifications/       # Notification endpoints
│   │   ├── real-time-prices/    # Real-time price endpoints
│   │   ├── shares-outstanding/  # Shares outstanding endpoints
│   │   └── tableau/             # Tableau integration endpoints
│   ├── error.tsx                 # Error boundary
│   ├── global-error.tsx          # Global error handler
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main dashboard page
│
├── components/                   # React components
│   ├── admin/                    # Administration components
│   │   ├── IntegrationSettings.tsx
│   │   └── LiveTrafficMonitor.tsx
│   ├── analytics/                # Analytics and visualization components
│   │   ├── advanced-analytics-dashboard.tsx
│   │   ├── historical-data-status.tsx
│   │   ├── risk-heatmap.tsx
│   │   └── trend-analysis-viewer.tsx
│   ├── compliance/               # Regulatory compliance components
│   │   ├── compliance-panel.tsx
│   │   ├── historical-breach-viewer.tsx
│   │   ├── pre-trade-simulator.tsx
│   │   ├── predictive-breach-table.tsx
│   │   ├── RegulatoryAuditLog.tsx
│   │   └── TimeTravelAuditView.tsx
│   ├── contexts/                 # React context providers
│   │   ├── AuditLogContext.tsx
│   │   ├── HistoricalDataContext.tsx
│   │   ├── IntegrationSettingsContext.tsx
│   │   ├── PortfolioContext.tsx
│   │   ├── providers.tsx
│   │   └── RiskContext.tsx
│   ├── notifications/            # Notification components
│   │   ├── escalation-modal.tsx
│   │   ├── notification-manager.tsx
│   │   └── notification-monitor.tsx
│   ├── tableau/                  # Tableau integration components
│   │   ├── tableau-risk-dashboard.tsx
│   │   └── tableau-viz.tsx
│   ├── ui/                       # Reusable UI components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── paginated-list.tsx
│   │   ├── progress.tsx
│   │   ├── select.tsx
│   │   ├── sheet.tsx
│   │   ├── switch.tsx
│   │   ├── virtualized-table-body.tsx
│   │   ├── virtualized-table-wrapper.tsx
│   │   └── virtualized-table.tsx
│   ├── advanced-filter.tsx        # Shared filter component
│   ├── DemoDevtoolsSidebar.tsx    # Development tools
│   ├── export-manager.tsx         # Export functionality
│   └── system-status.tsx          # System status component
│
├── docs/                         # Documentation
│   ├── ALERT_RULES_EXECUTION.md
│   ├── CLEAN_START.md
│   ├── DEPLOY_NOW.md
│   ├── DEPLOYMENT.md
│   ├── DYNAMIC_DATA_VERIFICATION.md
│   ├── FINAL_DEPLOY_STEPS.md
│   ├── LOAD_TIME_OPTIMIZATIONS.md
│   ├── NOTIFICATION_SETUP.md
│   ├── PERFORMANCE_OPTIMIZATIONS.md
│   ├── PRODUCTION_READINESS.md
│   ├── QUICK_DEPLOY.md
│   ├── REAL_TIME_SHARES_OUTSTANDING.md
│   ├── REPOSITORY_STRUCTURE.md (this file)
│   ├── SETUP_COMPLETE.md
│   ├── TEST_FIX_IMPLEMENTATION.md
│   ├── TEST_NOTIFICATIONS.md
│   ├── TEST_RESULTS.md
│   ├── UI_FEATURES_SUMMARY.md
│   ├── UI_FEATURES_VISIBILITY.md
│   ├── UPDATE_POLICY.md
│   └── VERIFICATION_CHECKLIST.md
│
├── lib/                          # Core business logic and utilities
│   ├── adapters/                 # Data source adapters
│   │   ├── CharlesRiverAdapter.ts
│   │   ├── FixProtocolAdapter.ts
│   │   ├── MockAdapter.ts
│   │   ├── RestProductionAdapter.ts
│   │   └── WebSocketProductionAdapter.ts
│   ├── data/                     # Static data
│   │   └── etf-universe.ts
│   ├── services/                 # Business services
│   │   └── shares-outstanding-service.ts
│   ├── types/                    # Type definitions
│   │   └── IDataProvider.ts
│   ├── utilities/                # Utility scripts and helpers
│   │   └── regulatory-audit.ts
│   ├── calculation-utils.ts
│   ├── compliance-engine.ts
│   ├── compliance-rules-engine.ts
│   ├── export-service.ts
│   ├── exposure-aggregation.ts
│   ├── filing-pdf.ts
│   ├── filter-utils.tsx
│   ├── historical-data-store.ts
│   ├── market-data-generator.ts
│   ├── mock-data.ts
│   ├── notification-service.ts
│   ├── performance-utils.ts
│   ├── tableau-config.ts
│   ├── use-risk-calculator.ts
│   └── utils.ts
│
├── scripts/                      # Build and deployment scripts
│   ├── deploy.ps1
│   ├── deploy-now.ps1
│   └── restart-dev.ps1
│
├── server/                       # Server-side code
│   ├── crd-fix-server.js        # FIX protocol server
│   └── README.md
│
├── types/                        # TypeScript type definitions
│   ├── exports.ts
│   ├── index.ts
│   ├── notifications.ts
│   └── react-simple-maps.d.ts
│
├── .gitignore
├── next.config.mjs
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── README.md                     # Main project README
├── tailwind.config.ts
└── tsconfig.json
```

## Component Organization

Components are organized by feature/domain:

- **admin/**: Administration and system configuration components
- **analytics/**: Analytics dashboards and data visualization
- **compliance/**: Regulatory compliance monitoring and breach detection
- **contexts/**: React context providers for state management
- **notifications/**: Notification management and monitoring
- **tableau/**: Tableau integration components
- **ui/**: Reusable UI primitives (buttons, cards, dialogs, etc.)

## Import Paths

All imports use the `@/` alias which maps to the project root:

- Components: `@/components/[category]/[component]`
- Library code: `@/lib/[module]`
- Types: `@/types/[type]`
- App routes: `@/app/[route]`

## Documentation

All documentation files are located in the `docs/` folder. The main README.md in the root provides an overview and getting started guide.

## Scripts

All PowerShell scripts for deployment and development are located in the `scripts/` folder.

## Best Practices

1. **Component Organization**: Place components in the appropriate feature folder
2. **Shared Components**: Use `components/ui/` for reusable UI primitives
3. **Context Providers**: All context providers should be in `components/contexts/`
4. **Documentation**: Add new documentation to the `docs/` folder
5. **Scripts**: Add deployment and utility scripts to the `scripts/` folder


