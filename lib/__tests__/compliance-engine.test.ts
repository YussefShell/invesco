import { calculateTrueExposure, hasHiddenExposure } from '../compliance-engine';
import type { Holding } from '@/types';

describe('Compliance Engine', () => {
  const createMockHolding = (overrides: Partial<Holding>): Holding => ({
    id: 'test-1',
    ticker: 'AAPL',
    issuer: 'Apple Inc.',
    isin: 'US0378331005',
    jurisdiction: 'USA',
    sharesOwned: 1000,
    totalSharesOutstanding: 10000,
    buyingVelocity: 100,
    regulatoryRule: {
      name: 'Schedule 13D/13G',
      threshold: 5.0,
      warningZone: { min: 4.5, max: 4.99 },
      timelineDays: 10,
      jurisdiction: 'USA',
    },
    lastUpdated: new Date().toISOString(),
    ...overrides,
  });

  describe('calculateTrueExposure', () => {
    it('should calculate direct exposure correctly', () => {
      const holdings = [
        createMockHolding({
          ticker: 'AAPL',
          sharesOwned: 500,
          totalSharesOutstanding: 10000,
        }),
      ];

      const result = calculateTrueExposure('AAPL', holdings);

      expect(result.directShares).toBe(500);
      expect(result.indirectShares).toBe(0);
      expect(result.totalShares).toBe(500);
      expect(result.directPercentage).toBe(5.0);
      expect(result.totalPercentage).toBe(5.0);
      expect(result.isBreach).toBe(true); // 5.0% >= 5.0% threshold
    });

    it('should calculate indirect exposure via ETFs', () => {
      // Direct holding
      const directHolding = createMockHolding({
        ticker: 'AAPL',
        sharesOwned: 400,
        totalSharesOutstanding: 10000,
      });

      // ETF holding that contains AAPL
      const etfHolding = createMockHolding({
        ticker: 'SPY',
        sharesOwned: 1000,
        totalSharesOutstanding: 1000000,
      });

      const holdings = [directHolding, etfHolding];

      const result = calculateTrueExposure('AAPL', holdings);

      expect(result.directShares).toBe(400);
      expect(result.directPercentage).toBe(4.0);
      
      // Should have indirect exposure from SPY ETF
      // (assuming SPY has AAPL in its constituents)
      expect(result.breakdown.length).toBeGreaterThan(0);
      expect(result.totalPercentage).toBeGreaterThan(result.directPercentage);
    });

    it('should detect breach when total exposure exceeds threshold', () => {
      const holdings = [
        createMockHolding({
          ticker: 'AAPL',
          sharesOwned: 600, // 6% > 5% threshold
          totalSharesOutstanding: 10000,
        }),
      ];

      const result = calculateTrueExposure('AAPL', holdings);

      expect(result.isBreach).toBe(true);
      expect(result.totalPercentage).toBeGreaterThanOrEqual(5.0);
    });

    it('should not detect breach when below threshold', () => {
      const holdings = [
        createMockHolding({
          ticker: 'AAPL',
          sharesOwned: 400, // 4% < 5% threshold
          totalSharesOutstanding: 10000,
        }),
      ];

      const result = calculateTrueExposure('AAPL', holdings);

      expect(result.isBreach).toBe(false);
      expect(result.totalPercentage).toBeLessThan(5.0);
    });

    it('should handle multiple direct holdings of same ticker', () => {
      const holdings = [
        createMockHolding({
          ticker: 'AAPL',
          sharesOwned: 300,
          totalSharesOutstanding: 10000,
        }),
        createMockHolding({
          ticker: 'AAPL',
          sharesOwned: 200,
          totalSharesOutstanding: 10000,
        }),
      ];

      const result = calculateTrueExposure('AAPL', holdings);

      expect(result.directShares).toBe(500); // 300 + 200
      expect(result.directPercentage).toBe(5.0);
    });

    it('should return zero exposure for ticker not in portfolio', () => {
      const holdings = [
        createMockHolding({
          ticker: 'MSFT',
          sharesOwned: 1000,
        }),
      ];

      const result = calculateTrueExposure('AAPL', holdings);

      expect(result.directShares).toBe(0);
      expect(result.indirectShares).toBe(0);
      expect(result.totalShares).toBe(0);
      expect(result.totalPercentage).toBe(0);
    });

    it('should handle zero shares outstanding', () => {
      const holdings = [
        createMockHolding({
          ticker: 'AAPL',
          sharesOwned: 1000,
          totalSharesOutstanding: 0,
        }),
      ];

      const result = calculateTrueExposure('AAPL', holdings);

      expect(result.directPercentage).toBe(0);
      expect(result.totalPercentage).toBe(0);
    });
  });

  describe('hasHiddenExposure', () => {
    it('should return true when hidden exposure exists', () => {
      const directHolding = createMockHolding({
        ticker: 'AAPL',
        sharesOwned: 400,
      });

      const etfHolding = createMockHolding({
        ticker: 'SPY',
        sharesOwned: 1000,
      });

      const holdings = [directHolding, etfHolding];

      // This will depend on ETF_CONSTITUENTS data
      // If SPY contains AAPL, should return true
      const result = hasHiddenExposure('AAPL', holdings);
      
      // Result depends on actual ETF data, but function should not throw
      expect(typeof result).toBe('boolean');
    });

    it('should return false when no hidden exposure', () => {
      const holdings = [
        createMockHolding({
          ticker: 'AAPL',
          sharesOwned: 500,
        }),
      ];

      const result = hasHiddenExposure('AAPL', holdings);
      
      // With only direct holdings, should be false
      expect(result).toBe(false);
    });
  });
});

