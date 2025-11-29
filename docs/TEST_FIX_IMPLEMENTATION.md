# Testing the Real FIX Protocol Implementation

## Quick Test Steps

1. **Start the FIX Gateway Server:**
   ```bash
   npm run fix-server
   ```
   Expected output:
   ```
   🚀 CRD FIX Gateway Digital Twin
   📡 Listening on ws://localhost:8080
   📋 Protocol: FIX 4.4 with SOH delimiters (\x01)
   ⏳ Waiting for connections...
   ```

2. **Start the Next.js Dashboard:**
   ```bash
   npm run dev
   ```
   Expected: Server starts on http://localhost:3000

3. **Test the Integration:**
   - Open http://localhost:3000 in your browser
   - Click the **Settings** gear icon (top right)
   - In Integration Settings:
     - Verify WebSocket URL is `ws://localhost:8080`
     - Toggle **"Enable FIX Listener"** to ON
   - Watch for:
     - Connection status should change to "connected"
     - Live Traffic Monitor should show:
       - `[CRD-FIX-GATEWAY] FIX Listener enabled. Connecting to ws://localhost:8080...`
       - `[CRD-FIX-GATEWAY] 35=8 | Symbol=NVDA | Qty=5000 | Side=Buy | Price=$450.25`
       - Raw FIX messages: `8=FIX.4.4|9=125|35=8|55=NVDA|...`
   - Check browser console for:
     - `[FIX-Adapter] Connecting to ws://localhost:8080...`
     - `[FIX-Adapter] ✅ WebSocket connected to ws://localhost:8080`
     - `[FIX-Adapter] Raw FIX: 8=FIX.4.4|9=125|...`
     - `[FIX-Adapter] Parsed: {msgType: "8", symbol: "NVDA", ...}`

4. **Verify Risk Graph Updates:**
   - The dashboard risk graphs should update in real-time
   - Velocity numbers should change based on FIX Execution Reports
   - Position data should reflect Buy/Sell trades

## Expected Behavior

✅ **Server Side:**
- Server accepts WebSocket connections on port 8080
- Sends FIX Execution Reports every 500ms - 2s
- Sends Heartbeat messages every 30 seconds
- Logs all connections and messages

✅ **Client Side:**
- Adapter connects to WebSocket successfully
- Parses raw FIX messages with SOH delimiters
- Extracts tags: 35 (MsgType), 55 (Symbol), 54 (Side), 38 (Qty), 44 (Price)
- Validates checksums (Tag 10)
- Updates subscribers with trade data
- Logs to Live Traffic Monitor

✅ **UI:**
- Settings panel shows WebSocket URL input
- Toggle enables/disables FIX Listener
- Live Traffic Monitor displays real FIX messages
- Risk graphs update based on parsed Execution Reports

## Troubleshooting

**If connection fails:**
- Check server is running: `netstat -ano | findstr :8080`
- Check browser console for WebSocket errors
- Verify WebSocket URL is correct (ws://localhost:8080)

**If no FIX messages appear:**
- Check server console for connection logs
- Verify FIX Listener is enabled in Settings
- Check browser console for parsing errors

**If risk graphs don't update:**
- Verify subscribers are registered for tickers
- Check console for parsed FIX message data
- Ensure Execution Reports contain valid Symbol (Tag 55)

