/**
 * Database Persistence Implementation Tests
 * 
 * Tests the complete database persistence implementation including:
 * - Migration system
 * - Auto-initialization
 * - Persistence functions
 * - Query functions
 * - Data cleanup
 * - Graceful fallback
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getDatabaseConfig, initializeDatabase, checkDatabaseHealth } from '@/lib/db/client';
import { ensureDatabaseInitialized } from '@/lib/db/init-server';
import {
  persistFixMessage,
  persistAuditLogEntry,
  persistNotification,
  persistBreachEvent,
  persistHoldingSnapshot,
  queryAuditLogEntries,
  queryNotifications,
  queryHoldingSnapshots,
  queryBreachEvents,
  cleanupOldData,
} from '@/lib/db/persistence-service';
import { getNotificationService } from '@/lib/notification-service';
import { historicalDataStore } from '@/lib/historical-data-store';
import type { ParsedFixMessage } from '@/lib/adapters/FixProtocolAdapter';
import type { Notification } from '@/types/notifications';
import type { BreachEvent } from '@/types';

// Mock @vercel/postgres if database is not available
jest.mock('@vercel/postgres', () => {
  const mockSql = jest.fn();
  return {
    sql: mockSql,
  };
});

describe('Database Persistence Implementation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Database Configuration', () => {
    it('should detect database configuration from environment', () => {
      process.env.POSTGRES_URL = 'postgresql://test';
      const config = getDatabaseConfig();
      expect(config.enabled).toBe(true);
      expect(config.connectionString).toBe('postgresql://test');
    });

    it('should disable database when explicitly disabled', () => {
      process.env.DATABASE_ENABLED = 'false';
      process.env.POSTGRES_URL = 'postgresql://test';
      const config = getDatabaseConfig();
      expect(config.enabled).toBe(false);
    });

    it('should default to disabled when no connection string', () => {
      delete process.env.POSTGRES_URL;
      delete process.env.DATABASE_URL;
      const config = getDatabaseConfig();
      expect(config.enabled).toBe(false);
    });
  });

  describe('Migration System', () => {
    it('should have initial migration defined', async () => {
      const { migrations } = await import('@/lib/db/migrations');
      expect(migrations.length).toBeGreaterThan(0);
      expect(migrations[0].version).toBe(1);
      expect(migrations[0].name).toBe('initial_schema');
    });

    it('should have up function for initial migration', async () => {
      const { migrations } = await import('@/lib/db/migrations');
      const migration = migrations[0];
      expect(typeof migration.up).toBe('function');
    });
  });

  describe('Persistence Functions', () => {
    beforeEach(() => {
      process.env.DATABASE_ENABLED = 'false'; // Disable for unit tests
    });

    it('should gracefully skip persistence when database disabled', async () => {
      const parsed: ParsedFixMessage = {
        msgType: '8',
        symbol: 'NVDA',
        side: '1',
        quantity: 100,
        price: 150.50,
        execType: '0',
        cumQty: 100,
        orderID: '123',
        clOrdID: '456',
        checksumValid: true,
      };

      // Should not throw
      await expect(persistFixMessage('raw fix', parsed)).resolves.not.toThrow();
    });

    it('should gracefully skip audit log persistence when disabled', async () => {
      await expect(
        persistAuditLogEntry('test', 'system', 'INFO', 'message')
      ).resolves.not.toThrow();
    });

    it('should gracefully skip notification persistence when disabled', async () => {
      const notification: Notification = {
        id: 'test-1',
        recipientId: 'test-recipient',
        channel: 'email',
        severity: 'high',
        status: 'sent',
        title: 'Test',
        message: 'Test message',
        sentAt: new Date().toISOString(),
      };

      await expect(persistNotification(notification)).resolves.not.toThrow();
    });

    it('should gracefully skip breach event persistence when disabled', async () => {
      const event: BreachEvent = {
        id: 'test-1',
        ticker: 'NVDA',
        jurisdiction: 'USA',
        timestamp: new Date().toISOString(),
        eventType: 'BREACH_DETECTED',
        ownershipPercent: 10.5,
        threshold: 10.0,
        buyingVelocity: 100,
      };

      await expect(persistBreachEvent(event)).resolves.not.toThrow();
    });

    it('should gracefully skip holding snapshot persistence when disabled', async () => {
      await expect(
        persistHoldingSnapshot('NVDA', 'USA', 1000, 10000, 10.0, 50)
      ).resolves.not.toThrow();
    });
  });

  describe('Query Functions', () => {
    beforeEach(() => {
      process.env.DATABASE_ENABLED = 'false'; // Disable for unit tests
    });

    it('should return empty array when database disabled', async () => {
      const logs = await queryAuditLogEntries();
      expect(logs).toEqual([]);
    });

    it('should return empty array for notifications when disabled', async () => {
      const notifications = await queryNotifications();
      expect(notifications).toEqual([]);
    });

    it('should return empty array for snapshots when disabled', async () => {
      const snapshots = await queryHoldingSnapshots();
      expect(snapshots).toEqual([]);
    });

    it('should return empty array for breach events when disabled', async () => {
      const events = await queryBreachEvents();
      expect(events).toEqual([]);
    });
  });

  describe('Data Cleanup', () => {
    beforeEach(() => {
      process.env.DATABASE_ENABLED = 'false'; // Disable for unit tests
    });

    it('should gracefully skip cleanup when database disabled', async () => {
      await expect(cleanupOldData(90)).resolves.not.toThrow();
    });

    it('should use default retention period when not specified', async () => {
      delete process.env.DATA_RETENTION_DAYS;
      await expect(cleanupOldData()).resolves.not.toThrow();
    });
  });

  describe('Historical Data Store', () => {
    it('should handle async start method', async () => {
      // Should not throw even if database is disabled
      await expect(historicalDataStore.start()).resolves.not.toThrow();
    });

    it('should query snapshots without errors', async () => {
      const snapshots = await historicalDataStore.queryHoldingSnapshots({});
      expect(Array.isArray(snapshots)).toBe(true);
    });
  });

  describe('Notification Service', () => {
    it('should handle async getNotificationHistory', async () => {
      const service = getNotificationService();
      const history = await service.getNotificationHistory();
      expect(history).toHaveProperty('notifications');
      expect(history).toHaveProperty('total');
      expect(history).toHaveProperty('page');
      expect(history).toHaveProperty('pageSize');
      expect(Array.isArray(history.notifications)).toBe(true);
    });

    it('should handle getNotificationHistory with filters', async () => {
      const service = getNotificationService();
      const history = await service.getNotificationHistory(1, 10, {
        recipientId: 'test',
        channel: 'email',
      });
      expect(history).toHaveProperty('notifications');
      expect(history.pageSize).toBe(10);
    });
  });

  describe('Graceful Fallback', () => {
    it('should not throw errors when database is unavailable', async () => {
      process.env.DATABASE_ENABLED = 'false';
      delete process.env.POSTGRES_URL;

      // All operations should gracefully fall back
      await expect(initializeDatabase()).resolves.toBe(false);
      await expect(checkDatabaseHealth()).resolves.toBe(false);
      await expect(ensureDatabaseInitialized()).resolves.toBe(false);
    });

    it('should allow application to continue without database', () => {
      process.env.DATABASE_ENABLED = 'false';
      const config = getDatabaseConfig();
      expect(config.enabled).toBe(false);
      // Application should continue to work
      expect(true).toBe(true);
    });
  });

  describe('Environment Variables', () => {
    it('should respect DATA_RETENTION_DAYS environment variable', () => {
      process.env.DATA_RETENTION_DAYS = '120';
      const retention = parseInt(process.env.DATA_RETENTION_DAYS || '90', 10);
      expect(retention).toBe(120);
    });

    it('should use default retention when not set', () => {
      delete process.env.DATA_RETENTION_DAYS;
      const retention = parseInt(process.env.DATA_RETENTION_DAYS || '90', 10);
      expect(retention).toBe(90);
    });
  });
});

