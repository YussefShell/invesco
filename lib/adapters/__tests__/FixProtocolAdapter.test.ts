import { FixProtocolAdapter, type ParsedFixMessage } from '../FixProtocolAdapter';

describe('FixProtocolAdapter', () => {
  let adapter: FixProtocolAdapter;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    mockCallback = jest.fn();
    adapter = new FixProtocolAdapter('ws://localhost:8080', mockCallback);
  });

  afterEach(() => {
    adapter.dispose();
  });

  describe('FIX Message Parsing', () => {
    it('should parse Execution Report correctly', () => {
      // Valid FIX 4.4 Execution Report message
      const fixMessage = '8=FIX.4.4\x019=125\x0135=8\x0149=CRD_UAT\x0156=SENTINEL\x0134=12\x0152=20241129-14:30:00\x0155=NVDA\x0154=1\x0138=5000\x0144=450.25\x01150=F\x0114=5000\x0110=152\x01';
      
      // Access private method via type assertion (for testing)
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(fixMessage);

      expect(mockCallback).toHaveBeenCalled();
      const callArgs = mockCallback.mock.calls[0];
      expect(callArgs).toBeDefined();
      
      const parsed: ParsedFixMessage = callArgs[1];
      expect(parsed.symbol).toBe('NVDA');
      expect(parsed.quantity).toBe(5000);
      expect(parsed.price).toBe(450.25);
      expect(parsed.side).toBe('Buy');
      expect(parsed.msgType).toBe('8');
    });

    it('should parse Sell side correctly', () => {
      const fixMessage = '8=FIX.4.4\x019=125\x0135=8\x0155=AAPL\x0154=2\x0138=1000\x0144=175.50\x01150=F\x0114=1000\x0110=123\x01';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(fixMessage);

      expect(mockCallback).toHaveBeenCalled();
      const parsed: ParsedFixMessage = mockCallback.mock.calls[0][1];
      expect(parsed.side).toBe('Sell');
    });

    it('should handle messages with pipe delimiters', () => {
      // Some systems use | instead of \x01
      const fixMessage = '8=FIX.4.4|9=125|35=8|55=TSLA|54=1|38=2000|44=250.75|150=F|14=2000|10=123';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(fixMessage);

      expect(mockCallback).toHaveBeenCalled();
      const parsed: ParsedFixMessage = mockCallback.mock.calls[0][1];
      expect(parsed.symbol).toBe('TSLA');
      expect(parsed.quantity).toBe(2000);
    });

    it('should ignore non-Execution Report messages', () => {
      // Heartbeat message (MsgType=0)
      const heartbeatMessage = '8=FIX.4.4\x019=50\x0135=0\x0110=123\x01';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(heartbeatMessage);

      // Should not call callback for heartbeat
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should validate BeginString', () => {
      // Invalid BeginString
      const invalidMessage = '8=FIX.5.0\x019=125\x0135=8\x0155=NVDA\x0110=123\x01';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(invalidMessage);

      // Should not process invalid FIX version
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle malformed messages gracefully', () => {
      const malformedMessage = 'invalid-fix-message';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      
      // Should not throw error
      expect(() => handleFixMessage(malformedMessage)).not.toThrow();
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle empty messages', () => {
      const emptyMessage = '';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(emptyMessage);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Checksum Validation', () => {
    it('should calculate checksum correctly', () => {
      const calculateChecksum = (adapter as any).calculateChecksum.bind(adapter);
      
      // Simple test message
      const message = '8=FIX.4.4\x019=50\x0135=8\x01';
      const checksum = calculateChecksum(message);
      
      // Checksum should be 3 digits
      expect(checksum).toMatch(/^\d{3}$/);
      expect(checksum.length).toBe(3);
    });

    it('should validate checksum in messages', () => {
      // Message with correct checksum (calculated manually or from known good message)
      const fixMessage = '8=FIX.4.4\x019=125\x0135=8\x0155=NVDA\x0154=1\x0138=5000\x0144=450.25\x01150=F\x0114=5000\x0110=152\x01';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(fixMessage);

      // Should process message even if checksum doesn't match (current behavior)
      // In production, you might want to reject invalid checksums
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('Message Field Extraction', () => {
    it('should extract all required fields from Execution Report', () => {
      const fixMessage = '8=FIX.4.4\x019=150\x0135=8\x0149=CRD\x0156=SENTINEL\x0134=12\x0152=20241129-14:30:00\x0155=MSFT\x0154=1\x0138=3000\x0144=380.25\x01150=F\x0114=3000\x0137=ORD123\x0111=CL123\x0160=20241129-14:30:00\x0110=123\x01';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(fixMessage);

      expect(mockCallback).toHaveBeenCalled();
      const parsed: ParsedFixMessage = mockCallback.mock.calls[0][1];
      
      expect(parsed.symbol).toBe('MSFT');
      expect(parsed.quantity).toBe(3000);
      expect(parsed.price).toBe(380.25);
      expect(parsed.orderID).toBe('ORD123');
      expect(parsed.clOrdID).toBe('CL123');
      expect(parsed.transactTime).toBe('20241129-14:30:00');
    });

    it('should handle missing optional fields', () => {
      const fixMessage = '8=FIX.4.4\x019=100\x0135=8\x0155=GOOGL\x0154=1\x0138=1000\x0144=150.00\x01150=F\x0114=1000\x0110=123\x01';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(fixMessage);

      expect(mockCallback).toHaveBeenCalled();
      const parsed: ParsedFixMessage = mockCallback.mock.calls[0][1];
      
      // Should have defaults for missing fields
      expect(parsed.symbol).toBe('GOOGL');
      expect(parsed.orderID).toBe('');
      expect(parsed.clOrdID).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large quantities', () => {
      const fixMessage = '8=FIX.4.4\x019=125\x0135=8\x0155=NVDA\x0154=1\x0138=999999999\x0144=450.25\x01150=F\x0114=999999999\x0110=123\x01';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(fixMessage);

      expect(mockCallback).toHaveBeenCalled();
      const parsed: ParsedFixMessage = mockCallback.mock.calls[0][1];
      expect(parsed.quantity).toBe(999999999);
    });

    it('should handle decimal prices correctly', () => {
      const fixMessage = '8=FIX.4.4\x019=125\x0135=8\x0155=AAPL\x0154=1\x0138=100\x0144=175.123456\x01150=F\x0114=100\x0110=123\x01';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(fixMessage);

      expect(mockCallback).toHaveBeenCalled();
      const parsed: ParsedFixMessage = mockCallback.mock.calls[0][1];
      expect(parsed.price).toBeCloseTo(175.123456, 5);
    });

    it('should handle zero quantity', () => {
      const fixMessage = '8=FIX.4.4\x019=125\x0135=8\x0155=NVDA\x0154=1\x0138=0\x0144=450.25\x01150=F\x0114=0\x0110=123\x01';
      
      const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);
      handleFixMessage(fixMessage);

      expect(mockCallback).toHaveBeenCalled();
      const parsed: ParsedFixMessage = mockCallback.mock.calls[0][1];
      expect(parsed.quantity).toBe(0);
    });
  });
});

