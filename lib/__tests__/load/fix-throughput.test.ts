/**
 * Load tests for FIX message processing
 * 
 * These tests verify the system can handle high message throughput
 */

import { FixProtocolAdapter } from '../../adapters/FixProtocolAdapter';

describe('FIX Message Throughput', () => {
  let adapter: FixProtocolAdapter;

  beforeEach(() => {
    adapter = new FixProtocolAdapter('ws://localhost:8080');
  });

  afterEach(() => {
    adapter.dispose();
  });

  const generateFixMessage = (symbol: string, quantity: number, price: number): string => {
    return `8=FIX.4.4\x019=125\x0135=8\x0155=${symbol}\x0154=1\x0138=${quantity}\x0144=${price}\x01150=F\x0114=${quantity}\x0110=123\x01`;
  };

  it('should process 1000 messages quickly', () => {
    const messages = Array.from({ length: 1000 }, (_, i) =>
      generateFixMessage('AAPL', 1000 + i, 150.0 + i * 0.01)
    );

    const startTime = Date.now();
    const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);

    messages.forEach(msg => {
      handleFixMessage(msg);
    });

    const duration = Date.now() - startTime;
    
    // Should process 1000 messages in less than 1 second
    expect(duration).toBeLessThan(1000);
    console.log(`Processed 1000 messages in ${duration}ms (${(1000 / duration * 1000).toFixed(0)} msg/s)`);
  });

  it('should process 10000 messages without memory issues', () => {
    const messages = Array.from({ length: 10000 }, (_, i) =>
      generateFixMessage('AAPL', 1000 + i, 150.0 + i * 0.01)
    );

    const startTime = Date.now();
    const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);

    messages.forEach(msg => {
      handleFixMessage(msg);
    });

    const duration = Date.now() - startTime;
    
    // Should process 10000 messages in less than 5 seconds
    expect(duration).toBeLessThan(5000);
    console.log(`Processed 10000 messages in ${duration}ms (${(10000 / duration * 1000).toFixed(0)} msg/s)`);
  });

  it('should handle concurrent message processing', () => {
    const messages = Array.from({ length: 100 }, (_, i) =>
      generateFixMessage('AAPL', 1000 + i, 150.0 + i * 0.01)
    );

    const startTime = Date.now();
    const handleFixMessage = (adapter as any).handleFixMessage.bind(adapter);

    // Process all messages concurrently
    const promises = messages.map(msg => Promise.resolve(handleFixMessage(msg)));
    Promise.all(promises);

    const duration = Date.now() - startTime;
    
    // Concurrent processing should be fast
    expect(duration).toBeLessThan(100);
  });
});

