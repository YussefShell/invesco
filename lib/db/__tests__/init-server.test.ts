/**
 * Database Initialization Tests
 */

import {
  ensureDatabaseInitialized,
  getInitializationStatus,
  resetInitializationState,
} from "../init-server";

// Mock dependencies
jest.mock("@vercel/postgres", () => ({
  sql: jest.fn(),
}));

jest.mock("../client", () => ({
  getDatabaseConfig: jest.fn(),
}));

jest.mock("../migrations", () => ({
  runMigrations: jest.fn(),
}));

describe("Database Initialization", () => {
  const mockSql = require("@vercel/postgres").sql;
  const mockGetDatabaseConfig = require("../client").getDatabaseConfig;
  const mockRunMigrations = require("../migrations").runMigrations;

  beforeEach(() => {
    jest.clearAllMocks();
    resetInitializationState();
    mockSql.mockResolvedValue({ rows: [] });
    mockRunMigrations.mockResolvedValue(undefined);
  });

  describe("ensureDatabaseInitialized", () => {
    it("should skip initialization if database is disabled", async () => {
      mockGetDatabaseConfig.mockReturnValue({
        enabled: false,
        connectionString: undefined,
      });

      const result = await ensureDatabaseInitialized();

      expect(result).toBe(false);
      expect(mockRunMigrations).not.toHaveBeenCalled();
    });

    it("should initialize database if enabled", async () => {
      mockGetDatabaseConfig.mockReturnValue({
        enabled: true,
        connectionString: "postgresql://test",
      });
      mockSql.mockResolvedValueOnce({ rows: [] }); // SELECT 1 test

      const result = await ensureDatabaseInitialized();

      expect(result).toBe(true);
      expect(mockRunMigrations).toHaveBeenCalled();
    });

    it("should only initialize once", async () => {
      mockGetDatabaseConfig.mockReturnValue({
        enabled: true,
        connectionString: "postgresql://test",
      });
      mockSql.mockResolvedValue({ rows: [] });

      await ensureDatabaseInitialized();
      await ensureDatabaseInitialized();

      // Should only call runMigrations once
      expect(mockRunMigrations).toHaveBeenCalledTimes(1);
    });

    it("should handle initialization errors gracefully", async () => {
      mockGetDatabaseConfig.mockReturnValue({
        enabled: true,
        connectionString: "postgresql://test",
      });
      mockSql.mockRejectedValueOnce(new Error("Connection error"));

      const result = await ensureDatabaseInitialized();

      expect(result).toBe(false);
      const status = getInitializationStatus();
      expect(status.initialized).toBe(false);
      expect(status.error).toBeDefined();
    });

    it("should return cached result on subsequent calls", async () => {
      mockGetDatabaseConfig.mockReturnValue({
        enabled: true,
        connectionString: "postgresql://test",
      });
      mockSql.mockResolvedValue({ rows: [] });

      const result1 = await ensureDatabaseInitialized();
      const result2 = await ensureDatabaseInitialized();

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result1).toBe(result2);
    });
  });

  describe("getInitializationStatus", () => {
    it("should return false before initialization", () => {
      const status = getInitializationStatus();

      expect(status.initialized).toBe(false);
      expect(status.error).toBeNull();
    });

    it("should return true after successful initialization", async () => {
      mockGetDatabaseConfig.mockReturnValue({
        enabled: true,
        connectionString: "postgresql://test",
      });
      mockSql.mockResolvedValue({ rows: [] });

      await ensureDatabaseInitialized();

      const status = getInitializationStatus();
      expect(status.initialized).toBe(true);
      expect(status.error).toBeNull();
    });

    it("should return error after failed initialization", async () => {
      mockGetDatabaseConfig.mockReturnValue({
        enabled: true,
        connectionString: "postgresql://test",
      });
      mockSql.mockRejectedValueOnce(new Error("Init error"));

      await ensureDatabaseInitialized();

      const status = getInitializationStatus();
      expect(status.initialized).toBe(false);
      expect(status.error).toBeDefined();
    });
  });

  describe("resetInitializationState", () => {
    it("should reset initialization state", async () => {
      mockGetDatabaseConfig.mockReturnValue({
        enabled: true,
        connectionString: "postgresql://test",
      });
      mockSql.mockResolvedValue({ rows: [] });

      await ensureDatabaseInitialized();
      expect(getInitializationStatus().initialized).toBe(true);

      resetInitializationState();

      expect(getInitializationStatus().initialized).toBe(false);
    });
  });
});

