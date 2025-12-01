# Tableau Dashboard Setup Guide

This guide explains how to create a real-time Tableau dashboard using your platform's mock data and integrate it into your application.

## Overview

The platform provides a REST API endpoint (`/api/tableau/data`) that serves portfolio data in formats that Tableau can consume. The dashboard automatically updates when your portfolio data changes.

## Step 1: Understanding the Data API

The Tableau data API is available at:
- **JSON Format**: `/api/tableau/data?format=json`
- **CSV Format**: `/api/tableau/data?format=csv`
- **Filtered by Jurisdiction**: `/api/tableau/data?format=json&jurisdiction=USA`

### Data Schema

The API returns portfolio holdings with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the holding |
| `ticker` | string | Stock ticker symbol |
| `issuer` | string | Company name |
| `isin` | string | International Securities Identification Number |
| `jurisdiction` | string | Regulatory jurisdiction (USA, UK, Hong Kong, APAC) |
| `sharesOwned` | number | Number of shares owned |
| `totalSharesOutstanding` | number | Total shares outstanding |
| `ownershipPercent` | number | Ownership percentage |
| `price` | number | Current market price |
| `regulatoryRuleCode` | string | Regulatory rule code (e.g., "Rule 13D") |
| `regulatoryRuleName` | string | Regulatory rule name |
| `threshold` | number | Regulatory threshold percentage |
| `status` | string | Risk status: "breach", "warning", or "safe" |
| `isBreach` | boolean | True if position is in breach |
| `isWarning` | boolean | True if position is in warning zone |
| `isSafe` | boolean | True if position is safe |
| `buyingVelocity` | number | Shares purchased per hour |
| `projectedBreachTimeHours` | number | Hours until breach (if in warning zone) |
| `projectedBreachTimeDays` | number | Days until breach (if in warning zone) |
| `lastUpdated` | string | ISO timestamp of last update |
| `timestamp` | string | Current timestamp |

## Step 2: Creating a Tableau Workbook

### Option A: Using Tableau Desktop with Web Data Connector

1. **Open Tableau Desktop**
2. **Connect to Data** → **Web Data Connector**
3. **Enter the URL**: `http://localhost:3000/api/tableau/data?format=json`
   - For production, use your deployed URL
4. **Configure the Connection**:
   - Tableau will parse the JSON response
   - Map the fields to your data model
5. **Create Visualizations**:
   - Risk status by jurisdiction
   - Ownership percentage trends
   - Projected breach times
   - Regulatory compliance overview

### Option B: Using Tableau Prep with JSON File

1. **Open Tableau Prep**
2. **Add Input** → **JSON File**
3. **Connect to the API** using a script or scheduled refresh
4. **Clean and Transform** the data
5. **Output** to Tableau Desktop or Tableau Server

### Option C: Using Tableau's REST API Connector

1. **Open Tableau Desktop**
2. **Connect to Data** → **More...** → **REST API**
3. **Enter the API URL**: `http://localhost:3000/api/tableau/data?format=json`
4. **Configure Authentication** (if required)
5. **Parse JSON Response** and create your data model

## Step 3: Recommended Visualizations

### 1. Risk Status Dashboard
- **Pie Chart**: Distribution of breach/warning/safe positions
- **Bar Chart**: Risk status by jurisdiction
- **Gauge Chart**: Overall portfolio risk level

### 2. Compliance Monitoring
- **Table**: All holdings with status, ownership %, and threshold
- **Heatmap**: Risk level by jurisdiction and ticker
- **Timeline**: Projected breach times

### 3. Regulatory Analysis
- **Tree Map**: Holdings grouped by regulatory rule
- **Scatter Plot**: Ownership % vs. Threshold
- **Trend Line**: Ownership percentage over time

### 4. Velocity Analysis
- **Bar Chart**: Buying velocity by ticker
- **Line Chart**: Projected breach times
- **Alert List**: Positions approaching thresholds

## Step 4: Publishing to Tableau Server/Cloud

1. **Publish Workbook**:
   - File → Publish Workbook
   - Choose Tableau Server or Tableau Cloud
   - Enter server URL and credentials

2. **Configure Permissions**:
   - Set appropriate user permissions
   - Enable embedding if needed

3. **Set Up Refresh Schedule**:
   - Data → Refresh Schedule
   - Set to refresh every 5-15 minutes for near real-time updates
   - Or use Tableau's REST API to trigger refreshes programmatically

## Step 5: Integrating into Your Platform

### Using the RealtimeTableauDashboard Component

The platform includes a `RealtimeTableauDashboard` component that:

1. **Automatically subscribes** to portfolio data changes
2. **Refreshes the dashboard** when data updates
3. **Provides controls** for manual refresh and configuration

### Configuration

1. **Open the Dashboard** in your application
2. **Click the Settings icon** (⚙️)
3. **Enter your Tableau workbook URL**:
   ```
   https://your-tableau-server.com/views/YourWorkbook/YourView
   ```
4. **Enable Auto-refresh** (optional):
   - The dashboard will refresh every 30 seconds
   - Or manually refresh using the refresh button

### Example Integration

The component is already integrated into the main dashboard at `/app/page.tsx`:

```tsx
import RealtimeTableauDashboard from "@/components/tableau/realtime-tableau-dashboard";

// In your component:
<RealtimeTableauDashboard />
```

## Step 6: Real-Time Updates

### How It Works

1. **Portfolio Data Changes**: When holdings are updated in `PortfolioContext`
2. **Component Detects Change**: `RealtimeTableauDashboard` subscribes to holdings
3. **API Updates**: The component triggers a refresh of the Tableau data API
4. **Dashboard Refreshes**: Tableau dashboard updates with new data

### Refresh Methods

- **Automatic**: Every 30 seconds (when auto-refresh is enabled)
- **Manual**: Click the refresh button
- **On Data Change**: When portfolio holdings change

## Step 7: Advanced Configuration

### Custom Data Filters

You can filter data by jurisdiction:

```typescript
// In your Tableau workbook, use parameters to filter:
/api/tableau/data?format=json&jurisdiction=USA
```

### Exporting Data

The component includes an "Export CSV" button that downloads the current portfolio data as a CSV file.

### Data API Endpoint

You can also access the data API directly:

```bash
# Get JSON data
curl http://localhost:3000/api/tableau/data?format=json

# Get CSV data
curl http://localhost:3000/api/tableau/data?format=csv

# Filter by jurisdiction
curl http://localhost:3000/api/tableau/data?format=json&jurisdiction=USA
```

## Troubleshooting

### Dashboard Not Updating

1. **Check Auto-refresh**: Ensure auto-refresh is enabled
2. **Verify API Endpoint**: Test the API endpoint directly in your browser
3. **Check Tableau URL**: Ensure the Tableau workbook URL is correct
4. **Browser Console**: Check for JavaScript errors

### Data Not Appearing

1. **Verify API Response**: Test `/api/tableau/data?format=json` in your browser
2. **Check Tableau Connection**: Ensure Tableau can connect to the API
3. **Review Data Schema**: Verify field names match your Tableau workbook

### Performance Issues

1. **Reduce Refresh Frequency**: Disable auto-refresh and refresh manually
2. **Filter Data**: Use jurisdiction filters to reduce data volume
3. **Optimize Tableau Workbook**: Reduce calculations and complex visualizations

## Best Practices

1. **Refresh Schedule**: Set Tableau to refresh every 5-15 minutes for balance between real-time and performance
2. **Data Caching**: The API uses no-cache headers to ensure fresh data
3. **Error Handling**: The component includes error handling and fallbacks
4. **Security**: In production, secure your Tableau Server with proper authentication

## Example Tableau Workbook Structure

```
Portfolio Risk Dashboard
├── Risk Overview Sheet
│   ├── Pie Chart: Status Distribution
│   ├── Gauge: Overall Risk Level
│   └── KPI Cards: Breaches, Warnings, Safe
├── Compliance Table Sheet
│   └── Table: All Holdings with Filters
├── Jurisdiction Analysis Sheet
│   ├── Bar Chart: Risk by Jurisdiction
│   └── Map: Geographic Risk Distribution
└── Velocity Analysis Sheet
    ├── Bar Chart: Buying Velocity
    └── Timeline: Projected Breach Times
```

## Next Steps

1. Create your Tableau workbook using the data API
2. Publish to Tableau Server/Cloud
3. Configure the dashboard URL in your application
4. Enable auto-refresh for real-time updates
5. Customize visualizations based on your needs

For more information, see:
- [Tableau Embedding API Documentation](https://help.tableau.com/current/api/embedding_api/en-us/index.html)
- [Tableau Web Data Connector Guide](https://tableau.github.io/webdataconnector/)

