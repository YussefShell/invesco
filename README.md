# Invesco Regulatory Risk Management System

A comprehensive regulatory compliance and risk management platform for institutional investment managers, supporting multiple jurisdictions including USA, UK, Hong Kong, and APAC regions.

## Features

- **Real-time Regulatory Monitoring**: Track positions across multiple jurisdictions with automatic breach detection
- **Predictive Breach Analysis**: Calculate time-to-breach based on buying velocity
- **Multi-Jurisdiction Support**: 
  - USA (SEC - Schedule 13D/13G)
  - UK (FCA - Form TR-1)
  - Hong Kong (SFC - Form 2)
  - APAC (Japan, South Korea, Singapore, Australia, China, India)
- **Pre-Trade Simulation**: Test trades before execution to predict regulatory impact
- **Automated Filing Generation**: Generate regulatory filing drafts in PDF format
- **Risk Heatmap**: Visual representation of regulatory risk across jurisdictions
- **Tableau Analytics Integration**: Embed interactive Tableau visualizations using the Embedding API v3 with support for Tableau Public, Server, and Cloud

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- (Optional) Production gateway endpoints for market data and regulatory configuration

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

The application requires environment variables for production data sources. For development, you can use the built-in mock data.

#### Option 1: Development with Mock Data (Recommended for Development)

No environment variables needed! Simply use the "Mock" data source in the application UI.

#### Option 2: Production Configuration

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your actual gateway URLs:

   ```env
   # Market Data Gateway Configuration
   MARKET_DATA_BASE_URL=https://your-market-data-gateway.example.com
   MARKET_DATA_API_KEY=your-api-key-here

   # Regulatory Configuration Gateway
   REG_CONFIG_BASE_URL=https://your-regulatory-config-gateway.example.com
   REG_CONFIG_API_KEY=your-api-key-here

   # WebSocket Gateway Configuration (Client-side)
   NEXT_PUBLIC_WS_BASE_URL=wss://your-websocket-gateway.example.com/market-stream
   NEXT_PUBLIC_WS_AUTH_TOKEN=your-websocket-auth-token-here

   # Tableau Embedding API v3 Configuration (Optional)
   # For Tableau Public visualizations, no configuration needed
   # For Tableau Server/Cloud, configure authentication below
   NEXT_PUBLIC_TABLEAU_DEFAULT_URL=https://public.tableau.com/views/YourWorkbook/YourView
   
   # Tableau Server/Cloud Configuration (Optional - for authenticated visualizations)
   NEXT_PUBLIC_TABLEAU_SERVER_URL=https://your-tableau-server.com
   NEXT_PUBLIC_TABLEAU_SITE_ID=your-site-id
   
   # Tableau Connected App Authentication (Optional - for secure embedding)
   NEXT_PUBLIC_TABLEAU_USE_CONNECTED_APP=false
   NEXT_PUBLIC_TABLEAU_CONNECTED_APP_CLIENT_ID=your-client-id
   NEXT_PUBLIC_TABLEAU_CONNECTED_APP_SECRET_ID=your-secret-id
   TABLEAU_CONNECTED_APP_SECRET_VALUE=your-secret-value  # Server-side only, never expose to client
   ```

### Running the Application

#### Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Production Build

```bash
npm run build
npm start
```

## Data Sources

The application supports three data source modes:

1. **Mock** (Default): Uses simulated data - perfect for development and testing
2. **Production REST**: Connects to REST/gRPC gateway endpoints
3. **Production WebSocket**: Connects to WebSocket streaming gateway

Switch between data sources using the UI controls in the application header.

## APAC Regulatory Filings

The system includes comprehensive APAC regulatory support:

- **Japan (FSA)**: FIEL Filing - 5 Business Days
- **South Korea (FSS)**: K-SD (Korea Securities Disclosure) - 5 Business Days
- **Singapore (MAS)**: SFA Notification - 2 Business Days
- **Australia (ASIC)**: Corporations Act Substantial Shareholder Notice - 2 Business Days
- **China (CSRC)**: CSRC Disclosure - 3 Business Days
- **India (SEBI)**: SEBI SAST (Substantial Acquisition of Shares) - 2 Business Days

All APAC jurisdictions use a 5.0% threshold with a warning zone of 4.5% - 4.99%.

## Tableau Integration

The application includes full support for Tableau Embedding API v3, allowing you to embed interactive Tableau visualizations directly into the dashboard.

### Using Tableau Public

For Tableau Public visualizations, simply configure the visualization URL in the Tableau component settings dialog. No authentication is required.

### Using Tableau Server/Cloud

For Tableau Server or Tableau Cloud visualizations, you have two authentication options:

#### Option 1: Basic Authentication (Simple)
Configure your Tableau Server URL and site ID in environment variables. Users will be prompted to authenticate when accessing visualizations.

#### Option 2: Connected Apps (Recommended for Production)
Use Tableau Connected Apps for seamless, secure authentication:

1. **Create a Connected App** in your Tableau Server/Cloud:
   - Go to Settings → Connected Apps
   - Create a new Connected App
   - Note the Client ID and Secret ID

2. **Configure Environment Variables**:
   ```env
   NEXT_PUBLIC_TABLEAU_SERVER_URL=https://your-tableau-server.com
   NEXT_PUBLIC_TABLEAU_SITE_ID=your-site-id
   NEXT_PUBLIC_TABLEAU_USE_CONNECTED_APP=true
   NEXT_PUBLIC_TABLEAU_CONNECTED_APP_CLIENT_ID=your-client-id
   NEXT_PUBLIC_TABLEAU_CONNECTED_APP_SECRET_ID=your-secret-id
   TABLEAU_CONNECTED_APP_SECRET_VALUE=your-secret-value
   ```

3. **Implement JWT Token Generation** (Server-side):
   Create an API route (e.g., `app/api/tableau/token/route.ts`) that generates JWT tokens using your Connected App credentials. The `lib/tableau-config.ts` utility provides helper functions for this.

### Tableau Component Features

- **Interactive Visualizations**: Full Tableau interactivity including filters, parameters, and actions
- **Responsive Design**: Automatic device layout optimization (desktop, tablet, phone)
- **Customizable Toolbar**: Control toolbar position and visibility
- **Fullscreen Mode**: View visualizations in fullscreen
- **Configuration Dialog**: Easy-to-use UI for configuring visualization settings

## Troubleshooting

### Connection Errors

If you see connection errors:

1. **For Development**: Switch to "Mock" data source in the application UI
2. **For Production**: 
   - Verify all environment variables are set in `.env.local`
   - Ensure your gateway endpoints are accessible
   - Check that API keys are valid

### Common Error Messages

- **"REG_CONFIG_BASE_URL is not configured"**: Set the `REG_CONFIG_BASE_URL` environment variable or use Mock mode
- **"MARKET_DATA_BASE_URL is not configured"**: Set the `MARKET_DATA_BASE_URL` environment variable or use Mock mode
- **"WEBSOCKET CONNECTION FAILED"**: Set the `NEXT_PUBLIC_WS_BASE_URL` environment variable or use Mock/REST mode

### Tableau Integration Issues

- **"Failed to load Tableau Embedding API"**: Check your internet connection and ensure the Tableau CDN is accessible
- **"No Tableau visualization URL configured"**: Use the settings button in the Tableau component to configure a visualization URL
- **Authentication errors with Tableau Server**: Verify your Connected App credentials and ensure JWT token generation is properly implemented server-side

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes (market data, regulatory config, notifications)
│   ├── page.tsx           # Main dashboard
│   └── layout.tsx         # Root layout
├── components/            # React components (organized by feature)
│   ├── admin/            # Administration components
│   ├── analytics/        # Analytics and visualization
│   ├── compliance/       # Regulatory compliance components
│   ├── contexts/         # React context providers
│   ├── notifications/    # Notification components
│   ├── tableau/          # Tableau integration
│   └── ui/               # Reusable UI primitives
├── docs/                 # Documentation files
├── lib/                  # Core business logic
│   ├── adapters/         # Data source adapters
│   ├── services/         # Business services
│   ├── utilities/        # Utility scripts
│   └── ...
├── scripts/              # Build and deployment scripts
├── server/               # Server-side code (FIX protocol server)
└── types/                # TypeScript type definitions
```

For detailed structure information, see [docs/REPOSITORY_STRUCTURE.md](docs/REPOSITORY_STRUCTURE.md).

## License

Private - Invesco Internal Use Only

