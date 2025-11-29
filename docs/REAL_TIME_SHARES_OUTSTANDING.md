# Real-Time Shares Outstanding Data

This feature automatically fetches and updates shares outstanding data from multiple financial data providers in real-time.

## How It Works

1. **Automatic Updates**: The system automatically checks for stale shares outstanding data (older than 24 hours) and updates it hourly.

2. **Multiple Data Sources**: The system tries multiple data sources in order:
   - **Yahoo Finance** (free, no API key required) - Primary source
   - **Alpha Vantage** (requires API key) - Premium fallback
   - **Financial Modeling Prep** (requires API key) - Premium fallback
   - **Polygon.io** (requires API key) - Premium fallback

3. **Smart Caching**: Shares outstanding data is cached for 24 hours since this data typically only changes quarterly when companies report earnings.

## API Endpoint

### GET `/api/shares-outstanding?ticker=AAPL`

Returns shares outstanding for a given ticker.

**Response:**
```json
{
  "ticker": "AAPL",
  "sharesOutstanding": 15500000000,
  "source": "yahoo_finance",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Setup for Premium Data Sources (Optional)

To enable premium data sources for better reliability and coverage, add these environment variables to your `.env.local` file:

```bash
# Alpha Vantage (Get free API key at https://www.alphavantage.co/support/#api-key)
ALPHA_VANTAGE_API_KEY=your_api_key_here

# Financial Modeling Prep (Get API key at https://site.financialmodelingprep.com/developer/docs/)
FINANCIAL_MODELING_PREP_API_KEY=your_api_key_here

# Polygon.io (Get API key at https://polygon.io/)
POLYGON_API_KEY=your_api_key_here
```

## Usage in Code

### Fetch Shares Outstanding for a Single Ticker

```typescript
import { fetchSharesOutstanding } from '@/lib/services/shares-outstanding-service';

const shares = await fetchSharesOutstanding('AAPL');
if (shares !== null) {
  console.log(`AAPL has ${shares.toLocaleString()} shares outstanding`);
}
```

### Fetch Shares Outstanding for Multiple Tickers

```typescript
import { fetchMultipleSharesOutstanding } from '@/lib/services/shares-outstanding-service';

const tickers = ['AAPL', 'MSFT', 'NVDA'];
const results = await fetchMultipleSharesOutstanding(tickers);

results.forEach((shares, ticker) => {
  console.log(`${ticker}: ${shares.toLocaleString()} shares`);
});
```

### Automatic Updates in PortfolioContext

The `PortfolioContext` automatically updates shares outstanding data:
- Initial update 5 seconds after component mounts
- Hourly checks for stale data (older than 24 hours)
- Updates holdings automatically when new data is available

## Data Sources Details

### Yahoo Finance (Free)
- **No API key required**
- **Rate Limits**: ~200 requests/hour (recommended)
- **Coverage**: US and international stocks
- **Update Frequency**: Daily

### Alpha Vantage
- **API Key Required**: Get free key at https://www.alphavantage.co/support/#api-key
- **Rate Limits**: 5 API requests per minute (free tier)
- **Coverage**: Global stocks
- **Update Frequency**: Real-time

### Financial Modeling Prep
- **API Key Required**: Get API key at https://site.financialmodelingprep.com/developer/docs/
- **Rate Limits**: Varies by plan (free tier available)
- **Coverage**: Global stocks
- **Update Frequency**: Daily

### Polygon.io
- **API Key Required**: Get API key at https://polygon.io/
- **Rate Limits**: Varies by plan
- **Coverage**: US stocks primarily
- **Update Frequency**: Real-time

## Notes

- Shares outstanding data typically changes quarterly (during earnings reports)
- The system caches data for 24 hours to minimize API calls
- Free sources (Yahoo Finance) are sufficient for most use cases
- Premium sources provide better reliability and real-time updates

