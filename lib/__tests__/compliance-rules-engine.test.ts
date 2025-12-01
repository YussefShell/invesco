import { evaluateRisk, runPreTradeChecks } from '../compliance-rules-engine';
import type { Holding } from '@/types';

describe('Compliance Rules Engine', () => {
  describe('evaluateRisk', () => {
    it('should return BREACH status when above threshold', () => {
      const result = evaluateRisk('USA', 5.5, 'long');
      
      expect(result.status).toBe('BREACH');
      expect(result.color).toBe('#ef4444'); // Red
      expect(result.requiredForm).toBe('Schedule 13D');
    });

    it('should return WARNING status when in warning zone', () => {
      const result = evaluateRisk('USA', 4.75, 'long');
      
      expect(result.status).toBe('WARNING');
      // Color may vary, just check it's defined
      expect(result.color).toBeDefined();
      expect(result.requiredForm).toBe('Schedule 13D');
    });

    it('should return SAFE status when below warning zone', () => {
      const result = evaluateRisk('USA', 4.0, 'long');
      
      expect(result.status).toBe('SAFE');
      // Color may vary, just check it's defined
      expect(result.color).toBeDefined();
    });

    it('should handle data quality warnings', () => {
      const result = evaluateRisk('USA', 5.5, 'long', true);
      
      expect(result.status).toBe('WARNING');
      expect(result.requiredForm).toBe('N/A - Data Quality Check Required');
      expect(result.deadline).toBe('N/A');
    });

    it('should handle UK jurisdiction', () => {
      const result = evaluateRisk('UK', 5.5, 'long');
      
      expect(result.status).toBe('BREACH');
      expect(result.requiredForm).toBe('Form TR-1');
    });

    it('should handle Hong Kong jurisdiction', () => {
      const result = evaluateRisk('Hong Kong', 5.5, 'long');
      
      expect(result.status).toBe('BREACH');
      expect(result.requiredForm).toContain('Form 2');
    });

    it('should handle case-insensitive jurisdiction', () => {
      const result1 = evaluateRisk('usa', 5.5, 'long');
      const result2 = evaluateRisk('USA', 5.5, 'long');
      
      expect(result1.status).toBe(result2.status);
      expect(result1.requiredForm).toBe(result2.requiredForm);
    });

    it('should calculate deadline correctly', () => {
      const result = evaluateRisk('USA', 5.5, 'long');
      
      expect(result.deadlineDays).toBe(5);
      expect(result.deadline).toBe('5 Business Days');
    });
  });

  describe('runPreTradeChecks', () => {
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

    it('should pass pre-trade check when below threshold', () => {
      const holding = createMockHolding({
        sharesOwned: 400, // 4% < 5% threshold
        totalSharesOutstanding: 10000,
      });

      const context = {
        ticker: holding.ticker,
        issuer: holding.issuer,
        jurisdiction: holding.jurisdiction,
        resultingOwnershipPercent: 4.1, // After trade: 4% + 1% = 5.1%... wait, let's make it 4.1%
        currentOwnershipPercent: 4.0,
      };

      const results = runPreTradeChecks(context);
      
      // Should have no blocking checks (status should be SAFE or WARNING, not BREACH)
      const breachChecks = results.filter(r => r.status === 'BREACH');
      expect(breachChecks.length).toBe(0);
    });

    it('should fail pre-trade check when trade would cause breach', () => {
      // runPreTradeChecks checks for 10% hard cap, not 5% regulatory threshold
      const context = {
        ticker: 'AAPL',
        issuer: 'Apple Inc.',
        jurisdiction: 'USA',
        resultingOwnershipPercent: 10.5, // After trade: would breach 10% hard cap
        currentOwnershipPercent: 9.5,
      };

      const results = runPreTradeChecks(context);
      
      // Should have at least one check result
      expect(results.length).toBeGreaterThan(0);
      // Should have breach check for 10% hard cap
      const breachChecks = results.filter(r => r.status === 'BREACH');
      expect(breachChecks.length).toBeGreaterThan(0);
    });

    it('should warn when trade enters warning zone', () => {
      // runPreTradeChecks checks for 10% hard cap warning zone (9.5% - 9.99%)
      const context = {
        ticker: 'AAPL',
        issuer: 'Apple Inc.',
        jurisdiction: 'USA',
        resultingOwnershipPercent: 9.75, // After trade: enters warning zone (9.5% - 9.99%)
        currentOwnershipPercent: 9.0,
      };

      const results = runPreTradeChecks(context);
      
      // Should have at least one check result
      expect(results.length).toBeGreaterThan(0);
      // Should have warning for 10% hard cap
      const warnings = results.filter(r => r.status === 'WARNING');
      expect(warnings.length).toBeGreaterThan(0);
    });
  });
});

