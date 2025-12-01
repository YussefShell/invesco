# UI Verification Checklist - Finnhub Integration

## ✅ Implementation Complete

All code changes have been implemented. Here's what should be visible in the UI:

### 1. **Data Source Selector** (Header - Top Right)
**Location**: Next to "View: Fund Level / Group Level" toggle
- **Component**: Dropdown Select menu
- **Options**:
  - Mock (Simulated)
  - **Finnhub (Real-Time)** ← NEW OPTION
  - Charles River (FIX)
  - Production REST
  - Production WebSocket
- **Current Selection**: Shows "Finnhub (Real-Time)" when selected
- **Description**: Shows "Real-time prices from Finnhub WebSocket" below dropdown

### 2. **Active Data Source Badge** (Header - Below Title)
**Location**: Below "Global Regulatory Risk Engine" title
- **Text**: "Active Data Source: Finnhub Real-Time Market Data"
- **Style**: Gray badge with border

### 3. **Connection Status Badges** (Header)
**When Finnhub is Connected**:
- Blue badge: "🔴 Live Market Data Streaming" with pulsing blue dot
- Green badge: "✓ Connected"

**When Connecting**:
- Amber badge: "Connecting to Finnhub..." with pulsing amber dot

**When Error**:
- Red badge: Shows error message

### 4. **Price Flash Effects** (Predictive Breach Table)
**Location**: Price column in the table
- **Green Flash**: When price increases
  - Background flashes green (rgba(34, 197, 94, 0.3))
  - Price text turns green
  - Duration: 400ms smooth fade-out
- **Red Flash**: When price decreases
  - Background flashes red (rgba(239, 68, 68, 0.3))
  - Price text turns red
  - Duration: 400ms smooth fade-out

### 5. **Real-Time Price Display**
**Location**: Price column in Predictive Breach Table
- Shows live price from Finnhub
- Green pulsing dot indicates real-time data
- Currency symbol displayed correctly

### 6. **Buying Velocity Updates**
**Location**: "Buying Velocity" column
- Values calculated as 1.5% of real market volume
- Updates every 60 seconds
- Based on actual Finnhub volume data

## How to Verify

### Step 1: Check Browser Console
Open DevTools (F12) and look for:
```
[Test Mode] Auto-switching to Finnhub data source...
[RealMarketAdapter] Connected to Finnhub WebSocket
[RealMarketAdapter] Subscribed to AAPL
[RealMarketAdapter] Subscribed to NVDA
...
[RealMarketAdapter] Fetched volume for AAPL: 50,000,000
```

### Step 2: Visual Checks
1. **Header Badge**: Should show "Finnhub Real-Time Market Data"
2. **Connection Badge**: Should show blue "🔴 Live Market Data Streaming"
3. **Data Source Dropdown**: Should show "Finnhub (Real-Time)" selected
4. **Price Column**: Should show prices with green pulsing dot
5. **Price Changes**: Watch for green/red flash effects

### Step 3: Test Price Updates
1. Open Google Finance on your phone
2. Compare prices - they should match!
3. Watch for flash effects when prices change

## Troubleshooting

### If Page Has Hydration Errors
The React hydration errors are likely due to Next.js build cache. Try:
1. Stop the dev server (Ctrl+C)
2. Delete `.next` folder: `rm -rf .next` (or delete manually)
3. Restart: `npm run dev`

### If Data Source Selector Not Showing
- Check that Select component is imported correctly
- Verify the dropdown is in the header section
- Check browser console for errors

### If Prices Not Updating
- Verify WebSocket connection is established (check console logs)
- Ensure symbols are subscribed (check console)
- Verify API key is set in `.env.local`
- Check Finnhub API status

### If Flash Effects Not Working
- Ensure prices are actually changing (check console logs)
- Verify framer-motion is installed
- Check that `priceFlash` state is updating

## Files Modified

1. ✅ `lib/adapters/RealMarketAdapter.ts` - Created
2. ✅ `components/contexts/RiskContext.tsx` - Added finnhub option
3. ✅ `components/compliance/predictive-breach-table.tsx` - Added flash effects
4. ✅ `components/contexts/PortfolioContext.tsx` - Volume-based velocity
5. ✅ `app/page.tsx` - Added data source selector and badges
6. ✅ `.env.local` - API key configured (if file exists)

## Next Steps

1. **Rebuild if needed**: Clear `.next` folder and restart
2. **Test connection**: Verify WebSocket connects successfully
3. **Watch prices**: Monitor real-time updates
4. **Compare**: Check prices match Google Finance
5. **Disable auto-switch**: Set `AUTO_ENABLE_FINNHUB = false` after testing

All implementation is complete and ready for testing!

