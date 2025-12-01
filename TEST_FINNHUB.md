# Testing Finnhub Real-Time Market Data

## Quick Start

### 1. Ensure Environment Variable is Set

Create or verify `.env.local` file in the project root contains:

```env
NEXT_PUBLIC_FINNHUB_API_KEY=d4mj7c9r01qjidi030f0d4mj7c9r01qjidi030fg
```

### 2. Start Development Server

The server should already be running. If not, run:
```bash
npm run dev
```

### 3. Open Browser

Navigate to: http://localhost:3000

### 4. Switch to Finnhub Data Source

**Option A: Using Browser Console**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run this command:
```javascript
// Access React DevTools to find RiskContext
// Or add this temporarily to a component
```

**Option B: Temporary Code Change**
Add this to `app/page.tsx` temporarily (inside the Dashboard component):

```typescript
const { setDataSource } = useRisk();

useEffect(() => {
  // Auto-switch to Finnhub on mount
  setDataSource("finnhub");
}, [setDataSource]);
```

**Option C: Direct Context Access**
If you have React DevTools installed:
1. Open React DevTools
2. Find `RiskProvider` component
3. In props, find `setDataSource` function
4. Call it with `"finnhub"`

## What to Look For

### ✅ Connection Status
- Check the header for "Active Data Source: Finnhub Real-Time Market Data"
- Connection status should show "connected" (green indicator)

### ✅ Real-Time Price Updates
- Prices in the Predictive Breach Table should update in real-time
- Watch for **green flash** when price goes up
- Watch for **red flash** when price goes down
- Compare prices with Google Finance - they should match!

### ✅ Volume-Based Velocity
- Buying Velocity column should show values based on real market volume
- Formula: `buyingVelocity = dailyVolume * 0.015` (1.5%)
- Values should update periodically (every 60 seconds)

### ✅ Console Logs
Open browser console and look for:
```
[RealMarketAdapter] Connected to Finnhub WebSocket
[RealMarketAdapter] Subscribed to AAPL
[RealMarketAdapter] Subscribed to NVDA
...
[RealMarketAdapter] Fetched volume for AAPL: 50,000,000
```

## Testing Checklist

- [ ] Server starts without errors
- [ ] Environment variable is loaded
- [ ] WebSocket connection established
- [ ] Symbols subscribed successfully
- [ ] Prices update in real-time
- [ ] Flash effects work (green/red)
- [ ] Volume data fetched
- [ ] Buying velocity calculated correctly
- [ ] Prices match Google Finance

## Troubleshooting

### "No Finnhub API key provided"
- Check `.env.local` file exists
- Verify API key is correct
- Restart dev server after creating `.env.local`

### "WebSocket connection failed"
- Check internet connection
- Verify API key is valid
- Check Finnhub status: https://status.finnhub.io/

### Prices not updating
- Check connection status in header
- Verify symbols are subscribed (check console logs)
- Ensure WebSocket is connected (check Network tab)

### No flash effects
- Ensure prices are actually changing
- Check browser console for errors
- Verify framer-motion is working

## Expected Behavior

1. **On Page Load:**
   - Adapter connects to Finnhub WebSocket
   - Subscribes to 6 symbols: AAPL, NVDA, TSLA, MSFT, AMZN, GOOGL
   - Fetches initial volume data from REST API

2. **During Runtime:**
   - Receives trade messages via WebSocket
   - Updates prices in real-time
   - Shows flash effects on price changes
   - Updates buying velocity based on volume

3. **Price Flash:**
   - Green flash = Price increased
   - Red flash = Price decreased
   - Flash duration: ~300ms

## Verification

Compare with external sources:
- Google Finance: https://www.google.com/finance
- Yahoo Finance: https://finance.yahoo.com
- Prices should match within a few seconds

