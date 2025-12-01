/**
 * Database Persistence Service Tests
 * 
 * Tests for database persistence functions with graceful fallback.
 */

// Mock @vercel/postgres first
jest.mock("@vercel/postgres", () => ({
  sql: jest.fn(),
}));

// Mock client
jest.mock("../client", () => ({
  getDatabaseConfig: jest.fn(() => ({
    enabled: false,
    connectionString: undefined,
  })),
}));

// Import after mocks are set up
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
} from "../persistence-service";

describe("Database Persistence Service", () => {
  const mockSql = require("@vercel/postgres").sql;
  const { getDatabaseConfig } = require("../client");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockResolvedValue({ rows: [], count: 0 });
    // Reset to default disabled state
    getDatabaseConfig.mockReturnValue({
      enabled: false,
      connectionString: undefined,
    });
  });

  describe("Database Disabled (Graceful Fallback)", () => {
    beforeEach(() => {
      // Already set in outer beforeEach
    });

    it("should skip persistence when database is disabled", async () => {
      await persistFixMessage("test", { msgType: "8", symbol: "NVDA" });
      expect(mockSql).not.toHaveBeenCalled();
    });

    it("should return empty array for queries when database is disabled", async () => {
      const result = await queryAuditLogEntries();
      expect(result).toEqual([]);
      expect(mockSql).not.toHaveBeenCalled();
    });
  });

  describe("Database Enabled", () => {
    beforeEach(() => {
      getDatabaseConfig.mockReturnValue({
        enabled: true,
        connectionString: "postgresql://test",
      });
    });

    describe("persistFixMessage", () => {
      it("should persist FIX message to database", async () => {
        const rawFix = "8=FIX.4.4|9=125|35=8|55=NVDA|38=5000|44=450.25|10=123|";
        const parsed = {
          msgType: "8",
          symbol: "NVDA",
          quantity: 5000,
          price: 450.25,
          side: "Buy",
        };

        await persistFixMessage(rawFix, parsed);

        // Check that sql was called with template parts array that includes the INSERT statement
        expect(mockSql).toHaveBeenCalled();
        const callArgs = mockSql.mock.calls[0];
        expect(callArgs[0]).toBeInstanceOf(Array);
        const sqlString = callArgs[0].join(""); // Join template parts to check content
        expect(sqlString).toContain("INSERT INTO fix_messages");
      });

      it("should handle errors gracefully", async () => {
        mockSql.mockRejectedValueOnce(new Error("Database error"));

        const rawFix = "8=FIX.4.4|9=125|35=8|";
        const parsed = { msgType: "8" };

        // Should not throw
        await expect(persistFixMessage(rawFix, parsed)).resolves.not.toThrow();
      });
    });

    describe("persistAuditLogEntry", () => {
      it("should persist audit log entry", async () => {
        await persistAuditLogEntry(
          "[2024-01-01 10:00:00] [SYSTEM] INFO: Test message",
          "SYSTEM",
          "INFO",
          "Test message"
        );

        expect(mockSql).toHaveBeenCalled();
      });
    });

    describe("persistNotification", () => {
      it("should persist notification", async () => {
        const notification = {
          id: "test-1",
          recipientId: "risk-manager-1",
          channel: "email",
          severity: "high",
          status: "sent",
          title: "Test",
          message: "Test message",
          sentAt: new Date().toISOString(),
        };

        await persistNotification(notification, "Test Recipient");

        expect(mockSql).toHaveBeenCalled();
      });
    });

    describe("persistBreachEvent", () => {
      it("should persist breach event", async () => {
        const event = {
          id: "breach-1",
          ticker: "NVDA",
          jurisdiction: "USA",
          ownershipPercent: 5.5,
          threshold: 5.0,
          eventType: "BREACH_DETECTED" as const,
          timestamp: new Date().toISOString(),
          buyingVelocity: 1000,
        };

        await persistBreachEvent(event);

        expect(mockSql).toHaveBeenCalled();
      });
    });

    describe("persistHoldingSnapshot", () => {
      it("should persist holding snapshot", async () => {
        await persistHoldingSnapshot(
          "NVDA",
          "USA",
          1000000,
          20000000,
          5.0,
          1000
        );

        expect(mockSql).toHaveBeenCalled();
      });
    });

    describe("queryAuditLogEntries", () => {
      it("should query audit log entries without filters", async () => {
        mockSql.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              entrytext: "[2024-01-01] [SYSTEM] INFO: Test",
              systemid: "SYSTEM",
              level: "INFO",
              message: "Test",
              createdat: new Date(),
            },
          ],
        });

        const result = await queryAuditLogEntries();

        expect(result).toHaveLength(1);
        expect(result[0].systemId).toBe("SYSTEM");
        expect(result[0].level).toBe("INFO");
      });

      it("should query with systemId filter", async () => {
        mockSql.mockResolvedValueOnce({ rows: [] });

        await queryAuditLogEntries(100, "SYSTEM");

        expect(mockSql).toHaveBeenCalled();
      });

      it("should return empty array on error", async () => {
        mockSql.mockRejectedValueOnce(new Error("Query error"));

        const result = await queryAuditLogEntries();

        expect(result).toEqual([]);
      });
    });

    describe("queryNotifications", () => {
      it("should query notifications", async () => {
        mockSql.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              recipient_id: "risk-manager-1",
              channel: "email",
              severity: "high",
              status: "sent",
              title: "Test",
              message: "Test message",
              sent_at: new Date(),
            },
          ],
        });

        const result = await queryNotifications();

        expect(result).toHaveLength(1);
        expect(result[0].recipientId).toBe("risk-manager-1");
      });
    });

    describe("queryHoldingSnapshots", () => {
      it("should query holding snapshots", async () => {
        mockSql.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              ticker: "NVDA",
              jurisdiction: "USA",
              sharesOwned: "1000000",
              totalSharesOutstanding: "20000000",
              ownershipPercent: "5.0",
              buyingVelocity: "1000",
              snapshotTime: new Date(),
            },
          ],
        });

        const result = await queryHoldingSnapshots("NVDA", "USA");

        expect(result).toHaveLength(1);
        expect(result[0].ticker).toBe("NVDA");
        expect(result[0].sharesOwned).toBe(1000000);
      });
    });

    describe("queryBreachEvents", () => {
      it("should query breach events", async () => {
        mockSql.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              ticker: "NVDA",
              jurisdiction: "USA",
              ownershipPercent: "5.5",
              threshold: "5.0",
              status: "BREACH_DETECTED",
              eventType: "BREACH_DETECTED",
              detectedAt: new Date(),
              resolvedAt: null,
            },
          ],
        });

        const result = await queryBreachEvents("NVDA", "USA");

        expect(result).toHaveLength(1);
        expect(result[0].ticker).toBe("NVDA");
        expect(result[0].ownershipPercent).toBe(5.5);
      });
    });

    describe("cleanupOldData", () => {
      it("should cleanup old data", async () => {
        mockSql.mockResolvedValue({ count: 10 });

        await cleanupOldData(90);

        expect(mockSql).toHaveBeenCalled();
      });

      it("should handle cleanup errors gracefully", async () => {
        mockSql.mockRejectedValueOnce(new Error("Cleanup error"));

        // Should not throw
        await expect(cleanupOldData(90)).resolves.not.toThrow();
      });
    });
  });
});

