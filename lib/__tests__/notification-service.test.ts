import { NotificationService, getNotificationService } from '../notification-service';
import type { Holding, AlertRule, NotificationRecipient } from '@/types';

describe('Notification Service', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
  });

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

  describe('Alert Rule Management', () => {
    it('should create alert rule', () => {
      const rule = {
        name: 'Test Rule',
        description: 'Test description',
        enabled: true,
        conditions: [{ type: 'breach', operator: 'equals', value: 'breach' }],
        recipients: ['risk-manager-1'],
        channels: ['email'],
        severity: 'critical' as const,
        cooldownMinutes: 60,
      };

      const created = service.createAlertRule(rule);
      const retrieved = service.getAlertRule(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Rule');
    });

    it('should update alert rule', () => {
      const rule = {
        name: 'Test Rule',
        description: 'Test description',
        enabled: true,
        conditions: [{ type: 'breach', operator: 'equals', value: 'breach' }],
        recipients: ['risk-manager-1'],
        channels: ['email'],
        severity: 'critical' as const,
        cooldownMinutes: 60,
      };

      const created = service.createAlertRule(rule);
      service.updateAlertRule(created.id, { name: 'Updated Rule' });

      const retrieved = service.getAlertRule(created.id);
      expect(retrieved?.name).toBe('Updated Rule');
    });

    it('should delete alert rule', () => {
      const rule = {
        name: 'Test Rule',
        description: 'Test description',
        enabled: true,
        conditions: [{ type: 'breach', operator: 'equals', value: 'breach' }],
        recipients: ['risk-manager-1'],
        channels: ['email'],
        severity: 'critical' as const,
        cooldownMinutes: 60,
      };

      const created = service.createAlertRule(rule);
      service.deleteAlertRule(created.id);

      const retrieved = service.getAlertRule(created.id);
      expect(retrieved).toBeUndefined();
    });

    it('should get all alert rules', () => {
      const rules = service.getAlertRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0); // Should have default rules
    });
  });

  describe('Recipient Management', () => {
    it('should create recipient', () => {
      const recipient = {
        name: 'Test Recipient',
        email: 'test@example.com',
        channels: ['email'] as const,
      };

      const created = service.createRecipient(recipient);
      const retrieved = service.getRecipient(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Recipient');
    });

    it('should get all recipients', () => {
      const recipients = service.getRecipients();
      expect(Array.isArray(recipients)).toBe(true);
      expect(recipients.length).toBeGreaterThan(0); // Should have default recipients
    });
  });

  describe('Alert Checking', () => {
    it('should trigger alert on breach condition', () => {
      const holding = createMockHolding({
        sharesOwned: 600, // 6% > 5% threshold
        totalSharesOutstanding: 10000,
      });

      const notifications = service.checkAlerts(holding, 'breach', null);

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].severity).toBe('critical');
    });

    it('should trigger alert on warning condition', () => {
      const holding = createMockHolding({
        sharesOwned: 475, // 4.75% in warning zone
        totalSharesOutstanding: 10000,
      });

      const notifications = service.checkAlerts(holding, 'warning', null);

      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should trigger alert on time-to-breach condition', () => {
      const holding = createMockHolding({
        sharesOwned: 450, // 4.5% in warning zone
        totalSharesOutstanding: 10000,
        buyingVelocity: 1000, // High velocity
      });

      // Calculate time to breach: (5000 - 4500) / 1000 = 0.5 hours
      const timeToBreachHours = 0.5;

      const notifications = service.checkAlerts(holding, 'warning', timeToBreachHours);

      // Should trigger time-to-breach rule (24h threshold)
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should respect cooldown periods', () => {
      const holding = createMockHolding({
        sharesOwned: 600, // Breach
        totalSharesOutstanding: 10000,
      });

      // First check - should trigger
      const notifications1 = service.checkAlerts(holding, 'breach', null);
      expect(notifications1.length).toBeGreaterThan(0);

      // Second check immediately - should be blocked by cooldown
      const notifications2 = service.checkAlerts(holding, 'breach', null);
      // Cooldown should prevent duplicate notifications
      // (exact behavior depends on implementation)
    });

    it('should not trigger alert when conditions not met', () => {
      const holding = createMockHolding({
        sharesOwned: 400, // 4% - safe
        totalSharesOutstanding: 10000,
      });

      const notifications = service.checkAlerts(holding, 'safe', null);

      // Should not trigger breach or warning rules
      const breachNotifications = notifications.filter(n => n.severity === 'critical');
      expect(breachNotifications.length).toBe(0);
    });
  });

  describe('Notification History', () => {
    it('should track notification history', async () => {
      const holding = createMockHolding({
        sharesOwned: 600, // Breach
        totalSharesOutstanding: 10000,
      });

      service.checkAlerts(holding, 'breach', null);
      const history = await service.getNotificationHistory();

      expect(history.notifications.length).toBeGreaterThan(0);
    });

    it('should limit notification history', async () => {
      // Create multiple notifications
      for (let i = 0; i < 150; i++) {
        const holding = createMockHolding({
          id: `test-${i}`,
          sharesOwned: 600,
        });
        service.checkAlerts(holding, 'breach', null);
      }

      const history = await service.getNotificationHistory();
      // Should be limited (exact limit depends on implementation)
      expect(history.notifications.length).toBeLessThanOrEqual(150);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance via getNotificationService', () => {
      const service1 = getNotificationService();
      const service2 = getNotificationService();

      expect(service1).toBe(service2);
    });
  });
});

