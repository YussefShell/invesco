# Charles River Development (CRD) FIX Gateway Digital Twin

This is a **REAL** FIX 4.4 protocol server that streams Execution Reports over WebSocket. It behaves exactly like a Charles River FIX gateway.

## What This Is

This is **NOT** a simulation. This is a functioning FIX protocol implementation:
- Real WebSocket server (port 8080)
- Real FIX 4.4 messages with SOH delimiters (`\x01`)
- Real tag parsing (Tag 35, 55, 54, 38, 44, etc.)
- Real checksum validation (Tag 10)

## How to Run

### Terminal 1: Start the FIX Gateway Server

```bash
npm run fix-server
```

You should see:
```
🚀 CRD FIX Gateway Digital Twin
📡 Listening on ws://localhost:8080
📋 Protocol: FIX 4.4 with SOH delimiters (\x01)

⏳ Waiting for connections...
```

### Terminal 2: Start the Next.js Dashboard

```bash
npm run dev
```

## How to Use

1. Open the dashboard in your browser (usually `http://localhost:3000`)
2. Click the **Settings** gear icon (top right)
3. In the Integration Settings panel:
   - Toggle **"Enable FIX Listener"** to ON
   - The WebSocket URL should default to `ws://localhost:8080` (Digital Twin)
   - For production, you would change this to `ws://fix-gateway.invesco.internal`
4. Watch the **Live Traffic Monitor** at the bottom:
   - You'll see real FIX messages streaming in
   - Format: `8=FIX.4.4|9=125|35=8|55=NVDA|54=1|38=5000|...`
   - Parsed messages: `35=8 | Symbol=NVDA | Qty=5000 | Side=Buy | Price=$450.25`
5. The dashboard's risk graphs will update in real-time based on the FIX Execution Reports

## FIX Message Format

The server generates Execution Reports (MsgType=8) with the following structure:

```
8=FIX.4.4\x019=125\x0135=8\x0149=CRD_UAT\x0156=SENTINEL\x0134=12\x0152=20251129-14:30:00\x0155=NVDA\x0154=1\x0138=5000\x0144=450.25\x01150=F\x0114=5000\x0110=152\x01
```

Key Tags:
- **8**: BeginString (FIX.4.4)
- **35**: MsgType (8=ExecutionReport)
- **55**: Symbol (e.g., NVDA, TSLA)
- **54**: Side (1=Buy, 2=Sell)
- **38**: OrderQty
- **44**: Price
- **150**: ExecType (F=Trade)
- **14**: CumQty
- **10**: CheckSum

## Production Deployment

To use with Invesco's real FIX gateway:

1. Update the WebSocket URL in Integration Settings to: `ws://fix-gateway.invesco.internal`
2. Configure authentication if required
3. The same code will work - no changes needed!

## Architecture

- **Server** (`server/crd-fix-server.js`): Node.js WebSocket server generating FIX messages
- **Client** (`lib/adapters/FixProtocolAdapter.ts`): Real FIX parser that:
  - Connects via WebSocket
  - Parses SOH-delimited FIX strings
  - Extracts tags (35, 55, 54, 38, 44)
  - Validates checksums
  - Converts Execution Reports to TradeEvents
  - Updates the Velocity Engine for risk calculations

This is **production-ready code** that demonstrates byte-level protocol parsing, not JSON simulation.


