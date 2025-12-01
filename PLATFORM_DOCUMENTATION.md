# Invesco Regulatory Risk Management Platform - Complete Documentation

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Technical Stack](#technical-stack)
5. [Data Sources & Adapters](#data-sources--adapters)
6. [Compliance Engine](#compliance-engine)
7. [Notification System](#notification-system)
8. [API Reference](#api-reference)
9. [Deployment](#deployment)
10. [Configuration](#configuration)
11. [Testing & Quality Assurance](#testing--quality-assurance)
12. [Security & Compliance](#security--compliance)
13. [Performance & Scalability](#performance--scalability)
14. [User Guide](#user-guide)
15. [Troubleshooting](#troubleshooting)

---

## Platform Overview

### What is This Platform?

The **Invesco Regulatory Risk Management System** is a mission-critical, enterprise-grade compliance and risk management platform designed for institutional investment managers. It provides real-time monitoring, predictive analysis, and automated compliance workflows across multiple global jurisdictions.

### Key Value Propositions

1. **Global Multi-Jurisdiction Compliance**: Supports regulatory requirements for USA, UK, Hong Kong, and APAC regions
2. **Predictive Risk Analytics**: Calculates time-to-breach based on buying velocity and position changes
3. **Hidden Exposure Detection**: Level 3 compliance that tracks indirect holdings through ETFs
4. **Real-Time Monitoring**: Live position tracking with instant breach detection and alerts
5. **Pre-Trade Simulation**: Test trades before execution to predict regulatory impact
6. **Automated Filing Generation**: Generate regulatory filing drafts in PDF format
7. **Enterprise Integration**: Supports FIX protocol, REST APIs, and WebSocket streaming

### Target Users

- **Global Head of Risk**: Primary user - mission-critical dashboard view
- **Compliance Officers**: Detailed compliance analysis and filing management
- **Portfolio Managers**: Pre-trade simulation and position monitoring
- **Operations Teams**: System configuration and integration management

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Dashboard  │  │  Analytics   │  │  Tableau     │         │
│  │   (Next.js)  │  │  Dashboards  │  │  Integration │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js App Router (API Routes)             │   │
│  │  • Market Data API    • Notification API                │   │
│  │  • Compliance API     • Export API                      │   │
│  │  • Tableau API        • Health Check API                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Compliance   │  │ Notification │  │  Export      │         │
│  │   Engine     │  │   Service    │  │  Service     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Risk         │  │ Historical   │  │  Filing      │         │
│  │ Calculator   │  │ Data Store   │  │  Generator   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Adapter Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Mock       │  │  REST        │  │  WebSocket   │         │
│  │  Adapter     │  │  Adapter     │  │   Adapter    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  Charles     │  │  FIX Protocol│                            │
│  │  River       │  │   Adapter    │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Systems                            │
│  • Market Data Gateways  • Regulatory Config Gateways          │
│  • Charles River Gateway • Tableau Server/Cloud                │
│  • Email/SMS Services    • Push Notification Services          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Persistence Layer                           │
│  • Vercel Postgres (Production)                                │
│  • In-Memory Storage (Development)                             │
│  • Historical Data Store                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Framework**: React 18
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **State Management**: React Context API
- **Charts/Visualization**: Custom React components, Tableau Embedding API v3
- **Virtualization**: TanStack Virtual (for large tables)

#### Backend
- **Runtime**: Node.js 18+
- **API Framework**: Next.js API Routes
- **WebSocket**: Native WebSocket API
- **Database**: Vercel Postgres (PostgreSQL)
- **PDF Generation**: pdf-lib
- **Excel Export**: xlsx

#### External Services
- **Email**: Resend API
- **SMS**: Twilio
- **Push Notifications**: Apple Push Notification Service (APNS)
- **Market Data**: Yahoo Finance, Alpha Vantage, Polygon.io, Financial Modeling Prep
- **Analytics**: Tableau (Public, Server, Cloud)

---

## Core Features

### 1. Real-Time Regulatory Monitoring

**Description**: Continuously monitors positions across all holdings and jurisdictions with automatic breach detection.

**Capabilities**:
- Real-time position tracking from multiple data sources
- Automatic ownership percentage calculation
- Threshold monitoring with visual indicators
- Multi-jurisdiction support (USA, UK, Hong Kong, APAC)

**Status Indicators**:
- 🟢 **Safe**: Position below 90% of threshold
- 🟡 **Warning**: Position between 90-99% of threshold
- 🔴 **Breach**: Position at or above threshold

### 2. Predictive Breach Analysis

**Description**: Calculates time-to-breach based on buying velocity and current position trends.

**Calculation Method**:
```
1. Total Exposure = Shares Owned + (Sum of: Contracts × 100 × Delta)
2. Threshold Shares = (Threshold / 100) × Total Shares Outstanding
3. Shares to Breach = Threshold Shares - Total Exposure
4. Time to Breach (hours) = Shares to Breach / Buying Velocity (shares/hour)
```

**Edge Cases**:
- If position already at/above threshold → Immediate "Breach" status
- If buying velocity is zero/negative → "Safe" status (no breach projected)
- If position below 90% threshold → "Safe" status regardless of velocity

### 3. Hidden Exposure Detection (Level 3 Compliance)

**Description**: The X-Ray feature detects and calculates indirect holdings through ETF exposure.

**Problem Solved**: Standard systems fail to track "hidden exposure" (e.g., owning Apple stock indirectly via the S&P 500 ETF).

**How It Works**:
1. Identifies ETF holdings in the portfolio
2. Recursively decomposes ETFs into their constituents
3. Calculates indirect exposure percentages
4. Aggregates direct + indirect exposure for true regulatory risk

**Example**:
- Direct AAPL holding: 4.80%
- Indirect via SPY ETF: +0.42%
- Indirect via QQQ ETF: +0.66%
- **Total Effective Ownership: 5.88%** (Exceeds 5% threshold → BREACH)

**Visual Indicator**: 👁️ Eye icon appears next to tickers with hidden exposure

### 4. Delta-Adjusted Exposure Calculation

**Description**: Accounts for derivative positions (options) in exposure calculations.

**Formula**:
```
Total Exposure = Shares Owned + (Sum of: Options Contracts × 100 × Delta)
```

**Why It Matters**: Institutional portfolios often use options strategies. Delta-adjusted exposure provides accurate regulatory risk calculation.

**Display**: Shows "Current Position" percentage with breakdown:
- "Total Exposure: X shares"
- "(incl. Y from options)" - if derivative positions exist

### 5. Data Quality Confidence Checks

**Description**: Validates shares outstanding data from multiple sources to ensure accuracy.

**Sources**:
- Bloomberg
- Refinitiv
- Primary source (Yahoo Finance or premium APIs)

**Validation Rules**:
- If Bloomberg and Refinitiv differ by >1% → **DATA QUALITY WARNING**
- Auto-filing is disabled when data quality warning is active
- Visual indicator: Yellow pulsing dot with warning message

**Impact**: Prevents incorrect regulatory filings due to bad denominator data.

### 6. Pre-Trade Simulation

**Description**: Test trades before execution to predict regulatory impact.

**Capabilities**:
- Simulate buying/selling shares
- Calculate resulting ownership percentage
- Check if trade would cause breach
- Preview time-to-breach changes
- Export simulation results

**Use Cases**:
- Portfolio managers planning large trades
- Compliance officers pre-approving transactions
- Risk managers assessing trade impact

### 7. Automated Filing Generation

**Description**: Generate regulatory filing drafts in PDF format.

**Supported Jurisdictions**:
- **USA**: SEC Schedule 13D/13G
- **UK**: FCA Form TR-1
- **Hong Kong**: SFC Form 2
- **APAC**: 
  - Japan (FSA) - FIEL Filing
  - South Korea (FSS) - K-SD Filing
  - Singapore (MAS) - SFA Notification
  - Australia (ASIC) - Corporations Act Notice
  - China (CSRC) - CSRC Disclosure
  - India (SEBI) - SEBI SAST Filing

**Features**:
- Automatic form population
- Multi-jurisdiction support
- PDF generation with proper formatting
- Download and print-ready

### 8. Risk Heatmap

**Description**: Visual representation of regulatory risk across jurisdictions.

**Features**:
- Interactive world map
- Color-coded risk levels by region
- Click to filter holdings by jurisdiction
- Real-time updates

### 9. Advanced Analytics Dashboard

**Description**: Comprehensive analytics and visualization tools.

**Components**:
- Historical data status
- Trend analysis viewer
- Risk metrics and KPIs
- Performance analytics

### 10. Tableau Integration

**Description**: Embed interactive Tableau visualizations directly into the dashboard.

**Supported Platforms**:
- Tableau Public (no authentication)
- Tableau Server (basic auth or Connected Apps)
- Tableau Cloud (Connected Apps)

**Features**:
- Full Tableau interactivity (filters, parameters, actions)
- Responsive design (desktop, tablet, phone)
- Customizable toolbar
- Fullscreen mode
- Real-time data updates

### 11. Notification System

**Description**: Multi-channel alert system with customizable rules.

**Channels**:
- **Email**: Via Resend API
- **SMS**: Via Twilio
- **Push Notifications**: Via Apple Push Notification Service (APNS)

**Alert Rule Types**:
- **Breach Conditions**: Trigger when position exceeds threshold
- **Warning Conditions**: Trigger when position enters warning zone
- **Time-to-Breach Conditions**: Trigger when time-to-breach falls below threshold
- **Jurisdiction Conditions**: Filter by specific jurisdictions

**Features**:
- Customizable alert rules
- Multiple recipients per rule
- Cooldown periods to prevent spam
- Notification history tracking
- Immediate execution on rule creation

### 12. Historical Data & Audit Trail

**Description**: Complete audit trail and historical data storage.

**Stored Data**:
- Holding snapshots (hourly)
- Breach events with timestamps
- FIX protocol messages (full audit trail)
- Audit log entries
- Notification history

**Features**:
- Time-travel audit view
- Historical breach viewer
- Trend analysis
- Regulatory compliance logging

### 13. Export Manager

**Description**: Export data in various formats for reporting and analysis.

**Export Formats**:
- Excel (.xlsx)
- CSV
- PDF reports

**Export Types**:
- Holdings data
- Breach reports
- Compliance reports
- Historical data

### 14. Entity Aggregation Engine

**Description**: View positions at different aggregation levels.

**Modes**:
- **Fund Level**: Individual fund exposures shown separately
- **Group Level**: Aggregated exposure across all funds

**Use Cases**:
- Fund managers need fund-level view
- Risk managers need group-level aggregated view
- Compliance officers need both views for different regulations

---

## Technical Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.5 | React framework with App Router |
| React | 18.3.1 | UI library |
| TypeScript | 5.5.3 | Type safety |
| Tailwind CSS | 3.4.4 | Styling |
| Radix UI | Latest | UI component primitives |
| Framer Motion | 11.18.2 | Animations |
| TanStack Virtual | 3.13.12 | Virtualized tables |
| Lucide React | 0.344.0 | Icons |
| Date-fns | 3.6.0 | Date manipulation |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Next.js API Routes | 14.2.5 | API endpoints |
| @vercel/postgres | 0.10.0 | Database client |
| pdf-lib | 1.17.1 | PDF generation |
| xlsx | 0.18.5 | Excel export |
| ws | 8.18.3 | WebSocket server/client |
| jsonwebtoken | 9.0.2 | JWT token generation |

### External Services

| Service | Purpose |
|---------|---------|
| Resend | Email notifications |
| Twilio | SMS notifications |
| @parse/node-apn | Apple Push Notifications |
| Yahoo Finance | Market data (free tier) |
| Alpha Vantage | Market data (premium) |
| Polygon.io | Market data (premium) |
| Financial Modeling Prep | Market data (premium) |
| Tableau | Analytics visualization |

---

## Data Sources & Adapters

### Supported Data Sources

1. **Mock Adapter** (Development)
   - Simulated data for development and testing
   - No external dependencies
   - Realistic data patterns

2. **REST Production Adapter**
   - Connects to REST/gRPC gateway endpoints
   - Polling-based updates
   - Configurable endpoints

3. **WebSocket Production Adapter**
   - Real-time streaming data
   - Low latency updates
   - Configurable WebSocket URL

4. **FIX Protocol Adapter (Charles River)**
   - Real FIX 4.4 protocol implementation
   - WebSocket-based execution reports
   - Full message parsing and validation

### Adapter Architecture

All adapters implement the `IDataProvider` interface:

```typescript
interface IDataProvider {
  getHoldings(): Promise<Holding[]>;
  getMarketData(ticker: string): Promise<MarketData>;
  getRegulatoryConfig(jurisdiction: string): Promise<RegulatoryConfig>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onDataUpdate(callback: (data: any) => void): void;
}
```

### FIX Protocol Server

The platform includes a digital twin FIX gateway server for testing:

**Features**:
- Real FIX 4.4 protocol implementation
- WebSocket server (port 8080)
- Execution Report messages (MsgType=8)
- Proper SOH delimiters (`\x01`)
- Checksum validation (Tag 10)

**Start Server**:
```bash
npm run fix-server
```

**Message Format**:
```
8=FIX.4.4|9=125|35=8|55=NVDA|54=1|38=5000|44=450.25|...
```

**Key Tags**:
- **8**: BeginString (FIX.4.4)
- **35**: MsgType (8=ExecutionReport)
- **55**: Symbol
- **54**: Side (1=Buy, 2=Sell)
- **38**: OrderQty
- **44**: Price

---

## Compliance Engine

### Regulatory Rules by Jurisdiction

#### USA (SEC)
- **Filing**: Schedule 13D/13G
- **Threshold**: 5.0%
- **Warning Zone**: 4.5% - 4.99%
- **Timeline**: 10 days to file after crossing threshold

#### UK (FCA)
- **Filing**: Form TR-1
- **Threshold**: 5.0%
- **Warning Zone**: 4.5% - 4.99%
- **Timeline**: 4 trading days to file

#### Hong Kong (SFC)
- **Filing**: Form 2
- **Threshold**: 5.0%
- **Warning Zone**: 4.5% - 4.99%
- **Timeline**: 3 business days to file

#### APAC Jurisdictions

| Jurisdiction | Filing | Threshold | Warning Zone | Timeline |
|--------------|--------|-----------|--------------|----------|
| Japan (FSA) | FIEL Filing | 5.0% | 4.5% - 4.99% | 5 Business Days |
| South Korea (FSS) | K-SD Filing | 5.0% | 4.5% - 4.99% | 5 Business Days |
| Singapore (MAS) | SFA Notification | 5.0% | 4.5% - 4.99% | 2 Business Days |
| Australia (ASIC) | Corporations Act Notice | 5.0% | 4.5% - 4.99% | 2 Business Days |
| China (CSRC) | CSRC Disclosure | 5.0% | 4.5% - 4.99% | 3 Business Days |
| India (SEBI) | SEBI SAST Filing | 5.0% | 4.5% - 4.99% | 2 Business Days |

### Compliance Calculation Logic

#### 1. Ownership Percentage Calculation

```typescript
ownershipPercent = (totalExposure / totalSharesOutstanding) × 100

where:
  totalExposure = sharesOwned + (sum of: optionsContracts × 100 × delta)
```

#### 2. True Regulatory Risk (Level 3)

Recursive ETF decomposition:
1. Start with direct holdings
2. For each ETF holding:
   - Look up ETF constituents
   - Calculate indirect exposure: `etfShares × (constituentWeight / 100)`
   - Recursively decompose nested ETFs
3. Aggregate direct + indirect exposure

#### 3. Status Determination

- **Breach**: `ownershipPercent >= threshold`
- **Warning**: `ownershipPercent >= threshold × 0.9 AND ownershipPercent < threshold`
- **Safe**: `ownershipPercent < threshold × 0.9`

#### 4. Time-to-Breach Calculation

```
if (buyingVelocity > 0 AND ownershipPercent < threshold × 0.9) {
  thresholdShares = (threshold / 100) × totalSharesOutstanding
  sharesToBreach = thresholdShares - totalExposure
  timeToBreachHours = sharesToBreach / buyingVelocity
}
```

### Compliance Rules Engine

The platform includes a sophisticated rules engine for pre-trade checks:

**Check Types**:
1. **Threshold Checks**: Verify position won't exceed threshold
2. **Warning Zone Checks**: Alert when entering warning zone
3. **Data Quality Checks**: Validate shares outstanding data
4. **Jurisdiction Checks**: Apply jurisdiction-specific rules
5. **Aggregation Checks**: Consider entity-level aggregation rules

---

## Notification System

### Architecture

The notification system is built on a singleton service pattern with event-driven rule evaluation.

**Components**:
1. **NotificationService**: Core service managing rules, recipients, and sending
2. **NotificationMonitor**: Background monitor checking rules every 30 seconds
3. **Alert Rules**: Configurable conditions and actions
4. **Recipients**: Users who receive notifications
5. **Channels**: Email, SMS, Push notifications

### Alert Rule Structure

```typescript
interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  recipients: string[]; // Recipient IDs
  channels: NotificationChannel[];
  cooldownMinutes: number;
  severity: AlertSeverity;
}

interface AlertCondition {
  type: "breach" | "warning" | "time_to_breach" | "jurisdiction";
  value?: number; // For time_to_breach (hours)
  jurisdiction?: string; // For jurisdiction filter
}
```

### Notification Channels

#### Email (Resend API)
- HTML email templates
- Professional formatting
- Includes breach details and links
- **Configuration**: `RESEND_API_KEY` environment variable

#### SMS (Twilio)
- Short, actionable messages
- Character limit aware
- Includes critical information only
- **Configuration**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

#### Push Notifications (APNS)
- iOS native push notifications
- Rich notifications with actions
- Badge updates
- **Configuration**: 
  - `APNS_KEY_ID`
  - `APNS_TEAM_ID`
  - `APNS_KEY_PATH` (or base64 encoded)
  - `APNS_BUNDLE_ID`

### Rule Execution Flow

```
1. Rule Created/Updated
   ↓
2. Custom Event Dispatched ('alert-rule-updated')
   ↓
3. NotificationMonitor Receives Event
   ↓
4. Immediate Check of All Holdings
   ↓
5. Rules Evaluated via checkAlerts()
   ↓
6. Conditions Checked via evaluateConditions()
   ↓
7. Notifications Created if Conditions Met
   ↓
8. Cooldown Check (prevent duplicates)
   ↓
9. Notifications Sent via sendNotification()
   ↓
10. Notification History Updated
```

### Cooldown Management

Prevents duplicate notifications by tracking when each rule was last triggered for each holding:
- Cooldown period configurable per rule (default: 60 minutes)
- Tracked as: `ruleId + holdingId → lastSentTimestamp`
- Only sends if cooldown period has passed

---

## API Reference

### Market Data APIs

#### GET /api/market-data
Fetch current market data for all holdings.

**Response**:
```json
{
  "holdings": [
    {
      "ticker": "AAPL",
      "price": 175.50,
      "sharesOutstanding": 15500000000,
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### GET /api/market-data/regulatory-config
Fetch regulatory configuration for a jurisdiction.

**Query Parameters**:
- `jurisdiction`: string (required) - e.g., "USA", "UK", "HK"

**Response**:
```json
{
  "jurisdiction": "USA",
  "threshold": 5.0,
  "warningZone": { "min": 4.5, "max": 4.99 },
  "filingType": "Schedule 13D/13G",
  "timelineDays": 10
}
```

### Notification APIs

#### GET /api/notifications
Get notification history.

**Query Parameters**:
- `limit`: number (optional) - Default: 50
- `offset`: number (optional) - Default: 0

**Response**:
```json
{
  "notifications": [...],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### POST /api/notifications/send
Send a notification immediately.

**Request Body**:
```json
{
  "recipientId": "rec-123",
  "channel": "email",
  "title": "Regulatory Breach Alert",
  "message": "Position in AAPL has breached threshold",
  "severity": "critical"
}
```

#### GET /api/notifications/recipients
Get all notification recipients.

#### POST /api/notifications/recipients
Create a new recipient.

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "channels": ["email", "sms"]
}
```

#### GET /api/notifications/alert-rules
Get all alert rules.

#### POST /api/notifications/alert-rules
Create a new alert rule.

**Request Body**:
```json
{
  "name": "Critical Breach Alert",
  "description": "Alert when position breaches threshold",
  "enabled": true,
  "conditions": [
    { "type": "breach" }
  ],
  "recipients": ["rec-123"],
  "channels": ["email", "sms"],
  "cooldownMinutes": 60,
  "severity": "critical"
}
```

### Export APIs

#### GET /api/exports
Get all export jobs.

#### POST /api/exports
Create a new export job.

**Request Body**:
```json
{
  "type": "holdings",
  "format": "xlsx",
  "filters": {
    "jurisdiction": "USA"
  }
}
```

**Response**:
```json
{
  "jobId": "exp-123",
  "status": "processing",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### GET /api/exports/jobs/[id]
Get export job status and download URL.

### Health Check API

#### GET /api/health
System health check.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "marketData": "connected",
    "notifications": "operational"
  }
}
```

### Shares Outstanding API

#### GET /api/shares-outstanding?ticker=AAPL
Get shares outstanding for a ticker.

**Response**:
```json
{
  "ticker": "AAPL",
  "totalSharesOutstanding": 15500000000,
  "totalShares_Bloomberg": 15520000000,
  "totalShares_Refinitiv": 15480000000,
  "lastUpdated": "2024-01-15T10:30:00Z",
  "dataQualityWarning": false
}
```

### Tableau API

#### POST /api/tableau/token
Generate JWT token for Tableau Connected Apps authentication.

**Request Body**:
```json
{
  "username": "user@example.com"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-15T11:30:00Z"
}
```

#### GET /api/tableau/data
Get data formatted for Tableau visualization.

---

## Deployment

### Deployment Options

#### 1. Vercel (Recommended)

The platform is optimized for Vercel deployment.

**Steps**:
1. Connect repository to Vercel
2. Add Vercel Postgres database
3. Configure environment variables
4. Deploy application
5. Initialize database: `POST /api/db/init`
6. Verify health check: `GET /api/health`

**Environment Variables**:
See [Configuration](#configuration) section for complete list.

#### 2. Self-Hosted

The platform can be deployed to any Node.js hosting environment:

**Requirements**:
- Node.js 18+
- PostgreSQL database (optional, can use in-memory)
- Environment variables configured

**Build**:
```bash
npm run build
npm start
```

### Database Initialization

After deployment, initialize the database:

```bash
curl -X POST https://your-domain.com/api/db/init
```

This creates all necessary tables:
- `fix_messages` - FIX protocol audit trail
- `audit_log_entries` - System audit logs
- `notifications` - Notification history
- `breach_events` - Regulatory breach events
- `holding_snapshots` - Historical holding data

### Deployment Scripts

PowerShell scripts are provided for Windows:

- `scripts/deploy.ps1` - Standard deployment
- `scripts/deploy-now.ps1` - Quick deployment
- `scripts/restart-dev.ps1` - Restart development server

---

## Configuration

### Environment Variables

#### Market Data Configuration

```env
# Market Data Gateway (REST)
MARKET_DATA_BASE_URL=https://your-market-data-gateway.example.com
MARKET_DATA_API_KEY=your-api-key-here

# WebSocket Gateway
NEXT_PUBLIC_WS_BASE_URL=wss://your-websocket-gateway.example.com/market-stream
NEXT_PUBLIC_WS_AUTH_TOKEN=your-websocket-auth-token-here
```

#### Regulatory Configuration Gateway

```env
REG_CONFIG_BASE_URL=https://your-regulatory-config-gateway.example.com
REG_CONFIG_API_KEY=your-api-key-here
```

#### Database Configuration

```env
# Vercel Postgres (auto-set by Vercel)
POSTGRES_URL=postgresql://user:password@host:5432/database

# Optional: Enable/disable database
DATABASE_ENABLED=true
```

#### Notification Services

```env
# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications (APNS)
APNS_KEY_ID=ABC123DEFG
APNS_TEAM_ID=XYZ987UVWX
APNS_KEY_PATH=/path/to/AuthKey_ABC123DEFG.p8
# OR use base64 encoded key:
APNS_KEY_BASE64=base64_encoded_key_content
APNS_BUNDLE_ID=com.yourcompany.app
```

#### Tableau Configuration

```env
# Tableau Public (no authentication needed)
NEXT_PUBLIC_TABLEAU_DEFAULT_URL=https://public.tableau.com/views/YourWorkbook/YourView

# Tableau Server/Cloud
NEXT_PUBLIC_TABLEAU_SERVER_URL=https://your-tableau-server.com
NEXT_PUBLIC_TABLEAU_SITE_ID=your-site-id

# Tableau Connected Apps (Optional)
NEXT_PUBLIC_TABLEAU_USE_CONNECTED_APP=false
NEXT_PUBLIC_TABLEAU_CONNECTED_APP_CLIENT_ID=your-client-id
NEXT_PUBLIC_TABLEAU_CONNECTED_APP_SECRET_ID=your-secret-id
TABLEAU_CONNECTED_APP_SECRET_VALUE=your-secret-value  # Server-side only
```

#### Premium Market Data APIs (Optional)

```env
# Alpha Vantage
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key

# Polygon.io
POLYGON_API_KEY=your-polygon-key

# Financial Modeling Prep
FMP_API_KEY=your-fmp-key
```

### Development Configuration

For development, you can use Mock data source (no environment variables needed):

1. Open the application
2. Click Settings gear icon
3. Select "Mock" data source
4. No external connections required

---

## Testing & Quality Assurance

### Test Results

Comprehensive testing has been performed:

#### Alert Rules Execution
- ✅ Rule creation and management
- ✅ Rule evaluation and execution
- ✅ Multiple condition types
- ✅ Cooldown management
- ✅ Immediate execution on creation

#### Data Sources
- ✅ Mock adapter (development)
- ✅ REST adapter
- ✅ WebSocket adapter
- ✅ FIX protocol adapter

#### Compliance Engine
- ✅ Ownership percentage calculation
- ✅ Delta-adjusted exposure
- ✅ ETF decomposition (Level 3)
- ✅ Time-to-breach calculation
- ✅ Multi-jurisdiction support

#### UI Components
- ✅ Lazy loading optimization
- ✅ Error boundaries
- ✅ Responsive design
- ✅ Virtualized tables
- ✅ Real-time updates

### Testing the Platform

#### 1. Test Hidden Exposure Detection (X-Ray)

1. Open the dashboard
2. Find AAPL in the Predictive Breach Table (should show eye icon 👁️)
3. Click the eye icon to expand breakdown
4. Verify:
   - Direct holding percentage shown
   - ETF-based indirect exposure shown
   - Total effective ownership calculated
   - BREACH badge appears if threshold exceeded

#### 2. Test Real-Time Shares Outstanding Updates

1. Open browser console (F12)
2. Wait 5 seconds after page load
3. Look for console logs:
   ```
   [Shares Outstanding Service] Checking for stale data...
   [Shares Outstanding Service] Fetching real-time data for AAPL...
   ```
4. Check Compliance Panel to see updated shares outstanding

#### 3. Test Pre-Trade Simulation

1. Click "Run Simulation" button
2. Select a ticker
3. Enter trade quantity
4. Review predicted impact:
   - Resulting ownership percentage
   - Breach status
   - Time-to-breach changes

#### 4. Test Notification System

1. Open Notification Manager
2. Create a new alert rule
3. Set conditions (e.g., breach detection)
4. Add recipients
5. Enable the rule
6. Trigger a breach condition
7. Verify notification sent

#### 5. Test FIX Protocol Integration

1. Start FIX server: `npm run fix-server`
2. Open Settings → Integration Settings
3. Enable FIX Listener
4. Set WebSocket URL to `ws://localhost:8080`
5. Watch Live Traffic Monitor for FIX messages
6. Verify risk graphs update in real-time

---

## Security & Compliance

### Security Features

1. **Environment Variable Protection**: Sensitive credentials stored in environment variables
2. **Database Connection Security**: Encrypted connections to PostgreSQL
3. **WebSocket Security**: TLS/SSL support (wss://) for production
4. **API Authentication**: Token-based authentication for external APIs
5. **Input Validation**: All API inputs validated and sanitized

### Compliance Features

1. **Audit Trail**: Complete logging of all regulatory events
2. **Data Retention**: Configurable retention policies
3. **Regulatory Reporting**: Automated filing generation
4. **Data Quality Validation**: Multiple source verification
5. **Time-Travel Audit**: Historical data access for compliance reviews

### Best Practices

1. **Never commit secrets**: Use environment variables
2. **Use HTTPS/WSS**: Always use encrypted connections in production
3. **Regular audits**: Review audit logs regularly
4. **Access control**: Limit access to production systems
5. **Monitoring**: Set up alerts for security events

---

## Performance & Scalability

### Performance Optimizations

1. **Lazy Loading**: Heavy components loaded on-demand
2. **Virtualized Tables**: Efficient rendering of large datasets
3. **Code Splitting**: Automatic code splitting by Next.js
4. **Caching**: Intelligent caching of market data
5. **Database Indexing**: Optimized database queries with indexes

### Scalability Features

1. **Horizontal Scaling**: Stateless API design supports horizontal scaling
2. **Connection Pooling**: Efficient database connection management
3. **Background Processing**: Async processing for heavy operations
4. **Rate Limiting**: Configurable rate limiting for API endpoints
5. **Load Balancing**: Compatible with load balancers

### Performance Metrics

Target metrics:
- **Initial Load Time**: < 2 seconds
- **API Response Time**: < 200ms (p95)
- **Real-Time Update Latency**: < 100ms
- **Dashboard Interactivity**: < 50ms

### Monitoring

Recommended monitoring:
- Application performance monitoring (APM)
- Error tracking and alerting
- Database performance monitoring
- API endpoint metrics
- Real-time user monitoring

---

## User Guide

### Getting Started

1. **Access the Dashboard**: Navigate to the application URL
2. **Select Data Source**: Choose Mock (development) or Production data source
3. **View Holdings**: Browse the Predictive Breach Table
4. **Explore Features**: Use the various panels and tools

### Navigation

#### Main Dashboard
- **Risk Heatmap**: Overview of global risk by jurisdiction
- **Predictive Breach Table**: Detailed holdings with risk status
- **Analytics Dashboards**: Advanced analytics and visualizations
- **Tableau Integration**: Embedded Tableau visualizations

#### Key Actions

1. **View Holding Details**:
   - Click any row in the Predictive Breach Table
   - Opens Compliance Panel with detailed information

2. **Run Pre-Trade Simulation**:
   - Click "Run Simulation" button
   - Enter trade details
   - Review predicted impact

3. **Manage Notifications**:
   - Scroll to Notification Manager section
   - Create alert rules
   - Add recipients
   - Configure channels

4. **Export Data**:
   - Scroll to Export Manager section
   - Select export type and format
   - Download generated file

### Entity Aggregation Views

Toggle between views using the header controls:
- **Fund Level**: Individual fund exposures
- **Group Level**: Aggregated exposure across all funds

### Data Source Switching

1. Click Settings gear icon (top right)
2. Select data source:
   - **Mock**: Development/testing data
   - **Charles River (FIX)**: FIX protocol streaming
   - **Production (REST)**: REST API gateway
   - **Production (WebSocket)**: WebSocket streaming

---

## Troubleshooting

### Common Issues

#### 1. "Connection Error" Messages

**Problem**: Cannot connect to data source

**Solutions**:
- Check environment variables are set correctly
- Verify gateway endpoints are accessible
- Try switching to Mock data source for testing
- Check network connectivity and firewall rules

#### 2. "Database Not Configured" Warning

**Problem**: Database features not available

**Solutions**:
- Database is optional - application works without it
- To enable: Configure `POSTGRES_URL` environment variable
- Initialize database: `POST /api/db/init`

#### 3. Notifications Not Sending

**Problem**: Alert rules not triggering notifications

**Solutions**:
- Check notification service credentials (email, SMS, push)
- Verify alert rules are enabled
- Check cooldown periods aren't blocking notifications
- Review browser console for errors
- Check notification history in Notification Manager

#### 4. Shares Outstanding Not Updating

**Problem**: Stale shares outstanding data

**Solutions**:
- System auto-updates hourly - wait for next update
- Check browser console for update logs
- Verify market data API keys if using premium sources
- Manual refresh: Reload page

#### 5. Tableau Visualizations Not Loading

**Problem**: Tableau dashboards not appearing

**Solutions**:
- Verify Tableau URL is configured correctly
- For Tableau Server: Check authentication credentials
- Check browser console for errors
- Verify network access to Tableau server
- For Connected Apps: Ensure JWT token generation is working

#### 6. FIX Protocol Not Connecting

**Problem**: FIX listener not receiving messages

**Solutions**:
- Verify FIX server is running: `npm run fix-server`
- Check WebSocket URL is correct: `ws://localhost:8080`
- Verify FIX Listener is enabled in Integration Settings
- Check Live Traffic Monitor for connection status
- Review browser console for WebSocket errors

### Debug Mode

Enable detailed logging by opening browser console (F12) and looking for:
- `[NotificationService]` - Notification system logs
- `[Shares Outstanding Service]` - Data update logs
- `[FIX Adapter]` - FIX protocol logs
- `[Compliance Engine]` - Compliance calculation logs

### Getting Help

1. **Check Documentation**: Review this documentation and other docs in `/docs` folder
2. **Review Logs**: Check browser console and server logs
3. **Health Check**: Visit `/api/health` to check system status
4. **Test Endpoints**: Use API endpoints to diagnose issues

---

## Additional Resources

### Documentation Files

- `README.md` - Quick start guide
- `docs/IMPLEMENTATION_SUMMARY.md` - Implementation details
- `docs/PRODUCTION_READINESS.md` - Production deployment guide
- `docs/REPOSITORY_STRUCTURE.md` - Code organization
- `docs/TEST_RESULTS.md` - Test results and verification
- `docs/NOTIFICATION_SETUP.md` - Notification configuration
- `docs/TABLEAU_SETUP.md` - Tableau integration guide
- `docs/VERCEL_DEPLOYMENT.md` - Vercel deployment guide

### API Documentation

All API endpoints are RESTful and follow OpenAPI standards. Use the health check endpoint to verify system status.

### Support

For issues or questions:
1. Review troubleshooting section
2. Check documentation files
3. Review code comments for implementation details
4. Check browser console for error messages

---

## License

**Private - Invesco Internal Use Only**

This platform is proprietary software developed for Invesco. All rights reserved.

---

## Version History

- **v0.1.0** (Current): Initial release
  - Multi-jurisdiction compliance monitoring
  - Predictive breach analysis
  - Hidden exposure detection (Level 3)
  - Pre-trade simulation
  - Notification system
  - Tableau integration
  - FIX protocol support
  - Database persistence
  - Export capabilities

---

*Last Updated: 2024*
*Platform Version: 0.1.0*

