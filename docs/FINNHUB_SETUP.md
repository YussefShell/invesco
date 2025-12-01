# Finnhub Real-Time Market Data Setup

## Overview

The application now supports **real-time market data** from Finnhub while maintaining a **hybrid data model**:
- **Private Data (Simulated)**: Shares Owned, Buying Strategy
- **Public Data (REAL)**: Live Price, Daily Volume, Company Name, Sector

## Setup Instructions

### 1. Get Your Finnhub API Key

1. Visit [https://finnhub.io/](https://finnhub.io/)
2. Sign up for a free account
3. Copy your API key from the dashboard

### 2. Configure Environment Variable

Create a `.env.local` file in the project root (if it doesn't exist) and add:

```env
NEXT_PUBLIC_FINNHUB_API_KEY=your_api_key_here
```

**Note**: The API key is already configured in your `.env.local` file with the provided key.

### 3. Switch to Finnhub Data Source

The Finnhub adapter is integrated into the RiskContext. To use it, you can:

**Option A: Programmatically (in code)**
```typescript
const { setDataSource } = useRisk();
setDataSource("finnhub");
```

**Option B: Via Browser Console**
```javascript
// Open browser console and run:
window.__setDataSource?.("finnhub");
```

**Option C: Add UI Toggle** (Future enhancement)
Add a data source selector in the IntegrationSettings component.

## Features

### Real-Time Price Streaming
- Connects to Finnhub WebSocket API (`wss://ws.finnhub.io`)
- Subscribes to portfolio symbols: `AAPL`, `NVDA`, `TSLA`, `MSFT`, `AMZN`, `GOOGL`
- Receives live trade messages with price (`p`) and volume (`v`)
- Updates prices in real-time on the dashboard

### Price Flash Effects
- **Green flash** when price increases
- **Red flash** when price decreases
- Standard Wall Street UI behavior for price movements
- Implemented in `PredictiveBreachTable` component

### Volume-Based Buying Velocity
- Calculates buying velocity as **1.5% of daily market volume**
- Simulates aggressive algorithmic accumulation strategy
- Updates automatically when market volume changes
- Formula: `buyingVelocity = dailyVolume * 0.015`

### Hybrid Data Model
- **Real Prices**: Live streaming from Finnhub WebSocket
- **Simulated Positions**: Shares owned and buying strategy remain simulated
- **Real Volume**: Daily volume from Finnhub REST API
- **Velocity Calculation**: Based on real market volume

## Technical Details

### RealMarketAdapter

Located at: `lib/adapters/RealMarketAdapter.ts`

**Key Features:**
- WebSocket connection with auto-reconnection
- Trade message parsing (`type: 'trade'`)
- Volume accumulation from trade messages
- REST API fallback for daily volume
- Price caching for immediate updates

**Methods:**
- `connect()`: Establishes WebSocket connection
- `subscribeToTicker()`: Subscribe to price updates
- `calculateBuyingVelocity()`: Get velocity based on volume
- `getDailyVolume()`: Get current daily volume

### Integration Points

1. **RiskContext** (`components/contexts/RiskContext.tsx`)
   - Added `"finnhub"` to `DataSource` type
   - Integrated `RealMarketAdapter` instantiation

2. **PortfolioContext** (`components/contexts/PortfolioContext.tsx`)
   - Volume-based velocity calculation
   - Periodic velocity updates (every 60 seconds)
   - Real-time price updates from adapter

3. **PredictiveBreachTable** (`components/compliance/predictive-breach-table.tsx`)
   - Price flash animations (green/red)
   - Real-time price display

## API Rate Limits

Finnhub Free Tier:
- **WebSocket**: 50 messages/second
- **REST API**: 60 calls/minute

The adapter implements:
- Rate limiting for REST API calls
- Batch processing for volume fetches
- Connection retry logic

## Troubleshooting

### Connection Issues
- Check that `NEXT_PUBLIC_FINNHUB_API_KEY` is set correctly
- Verify API key is valid and not expired
- Check browser console for WebSocket errors

### No Price Updates
- Ensure WebSocket connection is established (check connection status)
- Verify symbols are subscribed (check console logs)
- Check Finnhub API status: [https://status.finnhub.io/](https://status.finnhub.io/)

### Volume Not Updating
- REST API fallback should fetch initial volume
- WebSocket accumulates volume from trade messages
- Check network tab for API calls

## Demo Instructions

1. Start the development server: `npm run dev`
2. Open the application in your browser
3. Switch to Finnhub data source (see "Switch to Finnhub Data Source" above)
4. Open Google Finance on your phone
5. Compare prices - they should match in real-time!

## Next Steps

- Add UI toggle for data source selection
- Support additional symbols beyond the 6 default ones
- Add volume chart visualization
- Implement price history tracking

