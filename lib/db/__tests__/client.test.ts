/**
 * Database Client Tests
 */

import { getDatabaseConfig, checkDatabaseHealth, initializeDatabase } from "../client";

// Mock @vercel/postgres
jest.mock("@vercel/postgres", () => ({
  sql: jest.fn(),
}));

// Mock migrations
jest.mock("../migrations", () => ({
  runMigrations: jest.fn(),
}));

describe("Database Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getDatabaseConfig", () => {
    it("should return disabled if no connection string", () => {
      delete process.env.POSTGRES_URL;
      delete process.env.DATABASE_URL;
      delete process.env.POSTGRES_PRISMA_URL;
      delete process.env.DATABASE_ENABLED;

      const config = getDatabaseConfig();

      expect(config.enabled).toBe(false);
    });

    it("should enable if POSTGRES_URL is set", () => {
      process.env.POSTGRES_URL = "postgresql://test";

      const config = getDatabaseConfig();

      expect(config.enabled).toBe(true);
      expect(config.connectionString).toBe("postgresql://test");
    });

    it("should enable if DATABASE_URL is set", () => {
      process.env.DATABASE_URL = "postgresql://test";

      const config = getDatabaseConfig();

      expect(config.enabled).toBe(true);
    });

    it("should respect DATABASE_ENABLED=false", () => {
      process.env.POSTGRES_URL = "postgresql://test";
      process.env.DATABASE_ENABLED = "false";

      const config = getDatabaseConfig();

      expect(config.enabled).toBe(false);
    });

    it("should respect DATABASE_ENABLED=true", () => {
      process.env.DATABASE_ENABLED = "true";
      process.env.POSTGRES_URL = "postgresql://test";

      const config = getDatabaseConfig();

      expect(config.enabled).toBe(true);
    });
  });

  describe("checkDatabaseHealth", () => {
    const mockSql = require("@vercel/postgres").sql;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return false if database is disabled", async () => {
      delete process.env.POSTGRES_URL;

      const health = await checkDatabaseHealth();

      expect(health).toBe(false);
    });

    it("should return true if database is healthy", async () => {
      process.env.POSTGRES_URL = "postgresql://test";
      mockSql.mockResolvedValueOnce({ rows: [] });

      const health = await checkDatabaseHealth();

      expect(health).toBe(true);
      expect(mockSql).toHaveBeenCalled();
    });

    it("should return false on database error", async () => {
      process.env.POSTGRES_URL = "postgresql://test";
      mockSql.mockRejectedValueOnce(new Error("Connection error"));

      const health = await checkDatabaseHealth();

      expect(health).toBe(false);
    });
  });

  describe("initializeDatabase", () => {
    const mockSql = require("@vercel/postgres").sql;
    const mockRunMigrations = require("../migrations").runMigrations;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRunMigrations.mockResolvedValue(undefined);
      mockSql.mockResolvedValue({ rows: [] });
    });

    it("should skip if database is disabled", async () => {
      delete process.env.POSTGRES_URL;
      delete process.env.DATABASE_ENABLED;

      const result = await initializeDatabase();

      expect(result).toBe(false);
      expect(mockRunMigrations).not.toHaveBeenCalled();
    });

    it("should initialize if database is enabled", async () => {
      process.env.POSTGRES_URL = "postgresql://test";
      // Need to re-import to get fresh config
      jest.resetModules();
      const { initializeDatabase: initDb } = require("../client");
      const { runMigrations } = require("../migrations");
      runMigrations.mockResolvedValue(undefined);

      const result = await initDb();

      expect(result).toBe(true);
      expect(runMigrations).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      process.env.POSTGRES_URL = "postgresql://test";
      jest.resetModules();
      const { initializeDatabase: initDb } = require("../client");
      const { runMigrations } = require("../migrations");
      runMigrations.mockRejectedValueOnce(new Error("Migration error"));

      const result = await initDb();

      expect(result).toBe(false);
    });
  });
});

