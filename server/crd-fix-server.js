/**
 * Charles River Development (CRD) FIX Gateway Digital Twin
 * 
 * This is a REAL FIX 4.4 protocol server that streams Execution Reports
 * over WebSocket. It behaves exactly like a Charles River FIX gateway.
 * 
 * Usage: node server/crd-fix-server.js
 * Listens on: ws://localhost:8080
 */

const WebSocket = require('ws');

const PORT = 8080;
const SOH = '\x01'; // Standard FIX delimiter

// Common tickers for realistic simulation
const TICKERS = [
  'NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX',
  'AMD', 'INTC', 'JPM', 'BAC', 'GS', 'V', 'MA', 'WMT', 'JNJ', 'PG',
  'BP', 'SHEL', 'XOM', 'CVX', 'RDS.A'
];

/**
 * Generate a FIX 4.4 Execution Report (MsgType=8)
 * Returns a raw FIX string with SOH delimiters
 */
function generateFixExecutionReport() {
  const ticker = TICKERS[Math.floor(Math.random() * TICKERS.length)];
  const side = Math.random() > 0.5 ? '1' : '2'; // 1=Buy, 2=Sell
  const quantity = Math.floor(1000 + Math.random() * 20000);
  const price = (50 + Math.random() * 500).toFixed(2);
  const execType = 'F'; // Trade (fully executed)
  const cumQty = quantity;
  const clOrdID = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const orderID = `CRD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  // Get FIX timestamp (YYYYMMDD-HH:mm:ss)
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  const transactTime = `${year}${month}${day}-${hours}:${minutes}:${seconds}`;

  // Build FIX message body (without BeginString, BodyLength, and Checksum)
  const bodyFields = [
    `35=8`,           // MsgType: ExecutionReport
    `49=CRD_UAT`,     // SenderCompID
    `56=SENTINEL`,    // TargetCompID
    `34=${Math.floor(Math.random() * 1000) + 1}`, // MsgSeqNum
    `52=${transactTime}`, // SendingTime
    `55=${ticker}`,   // Symbol
    `54=${side}`,     // Side (1=Buy, 2=Sell)
    `38=${quantity}`, // OrderQty
    `44=${price}`,    // Price
    `150=${execType}`, // ExecType
    `14=${cumQty}`,   // CumQty
    `17=${orderID}`,  // ExecID
    `37=${orderID}`,  // OrderID
    `11=${clOrdID}`,  // ClOrdID
    `20=0`,           // ExecTransType (New)
    `39=2`,           // OrdStatus (Partially filled)
    `59=0`,           // TimeInForce (Day)
    `60=${transactTime}`, // TransactTime
  ];

  const body = bodyFields.join(SOH);
  const bodyLength = body.length;

  // Build complete message
  const message = [
    `8=FIX.4.4`,      // BeginString
    `9=${bodyLength}`, // BodyLength
    body,             // Body
  ].join(SOH);

  // Calculate checksum (sum of all bytes mod 256)
  let checksum = 0;
  for (let i = 0; i < message.length; i++) {
    checksum = (checksum + message.charCodeAt(i)) % 256;
  }
  const checksumStr = String(checksum).padStart(3, '0');

  // Append checksum
  const fullMessage = message + SOH + `10=${checksumStr}` + SOH;

  return {
    raw: fullMessage,
    parsed: {
      ticker,
      side: side === '1' ? 'Buy' : 'Sell',
      quantity,
      price: parseFloat(price),
      execType,
      cumQty,
      transactTime,
    }
  };
}

/**
 * Generate a FIX Heartbeat (MsgType=0)
 */
function generateFixHeartbeat() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  const sendingTime = `${year}${month}${day}-${hours}:${minutes}:${seconds}`;

  const bodyFields = [
    `35=0`,           // MsgType: Heartbeat
    `49=CRD_UAT`,
    `56=SENTINEL`,
    `34=${Math.floor(Math.random() * 1000) + 1}`,
    `52=${sendingTime}`,
  ];

  const body = bodyFields.join(SOH);
  const bodyLength = body.length;

  const message = [
    `8=FIX.4.4`,
    `9=${bodyLength}`,
    body,
  ].join(SOH);

  let checksum = 0;
  for (let i = 0; i < message.length; i++) {
    checksum = (checksum + message.charCodeAt(i)) % 256;
  }
  const checksumStr = String(checksum).padStart(3, '0');

  return message + SOH + `10=${checksumStr}` + SOH;
}

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT });

console.log(`\n🚀 CRD FIX Gateway Digital Twin`);
console.log(`📡 Listening on ws://localhost:${PORT}`);
console.log(`📋 Protocol: FIX 4.4 with SOH delimiters (\\x01)\n`);

wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log(`✅ Client connected: ${clientIP}`);

  // Send logon acknowledgment
  ws.send(JSON.stringify({
    type: 'logon',
    message: 'FIX session established. Ready to stream Execution Reports.',
    timestamp: new Date().toISOString()
  }));

  // Send heartbeat every 30 seconds
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const heartbeat = generateFixHeartbeat();
      ws.send(heartbeat);
      console.log(`💓 Heartbeat sent to ${clientIP}`);
    }
  }, 30000);

  // Send Execution Reports every 500ms - 2s (randomized)
  const executionReportInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const fixMessage = generateFixExecutionReport();
      ws.send(fixMessage.raw);
      console.log(`📊 ExecutionReport: ${fixMessage.parsed.ticker} ${fixMessage.parsed.side} ${fixMessage.parsed.quantity} @ $${fixMessage.parsed.price}`);
    }
  }, 500 + Math.random() * 1500);

  ws.on('message', (message) => {
    const msgStr = message.toString();
    console.log(`📥 Received from ${clientIP}: ${msgStr.substring(0, 100)}...`);
    
    // Echo back if it's a test message
    if (msgStr.includes('TEST')) {
      ws.send(JSON.stringify({
        type: 'echo',
        message: 'Test message received',
        timestamp: new Date().toISOString()
      }));
    }
  });

  ws.on('close', () => {
    console.log(`❌ Client disconnected: ${clientIP}`);
    clearInterval(heartbeatInterval);
    clearInterval(executionReportInterval);
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${clientIP}:`, error);
  });
});

wss.on('error', (error) => {
  console.error('❌ Server error:', error);
});

console.log('⏳ Waiting for connections...\n');

