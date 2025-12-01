/**
 * Database Migration System Tests
 */

import { migrations, runMigrations, getCurrentMigrationVersion } from "../migrations";

// Mock @vercel/postgres
jest.mock("@vercel/postgres", () => ({
  sql: jest.fn(),
}));

// Mock client
jest.mock("../client", () => ({
  getDatabaseConfig: jest.fn(() => ({
    enabled: true,
    connectionString: "postgresql://test",
  })),
}));

describe("Database Migrations", () => {
  const mockSql = require("@vercel/postgres").sql;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockResolvedValue({ rows: [], count: 0 });
  });

  describe("migrations array", () => {
    it("should have at least one migration", () => {
      expect(migrations.length).toBeGreaterThan(0);
    });

    it("should have migrations in order", () => {
      for (let i = 0; i < migrations.length; i++) {
        expect(migrations[i].version).toBe(i + 1);
      }
    });

    it("should have initial_schema migration", () => {
      const initialMigration = migrations.find((m) => m.version === 1);
      expect(initialMigration).toBeDefined();
      expect(initialMigration?.name).toBe("initial_schema");
    });
  });

  describe("runMigrations", () => {
    it("should create schema_migrations table first", async () => {
      mockSql.mockResolvedValueOnce({ rows: [] }); // schema_migrations query
      mockSql.mockResolvedValueOnce({ rows: [] }); // applied migrations query

      await runMigrations(mockSql);

      // Should create schema_migrations table
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("CREATE TABLE IF NOT EXISTS schema_migrations"),
        ])
      );
    });

    it("should run pending migrations", async () => {
      // No applied migrations
      mockSql.mockResolvedValueOnce({ rows: [] }); // schema_migrations creation
      mockSql.mockResolvedValueOnce({ rows: [] }); // applied migrations query

      await runMigrations(mockSql);

      // Should run migration 1
      expect(mockSql).toHaveBeenCalled();
    });

    it("should skip already applied migrations", async () => {
      // Migration 1 already applied
      mockSql.mockResolvedValueOnce({ rows: [] }); // schema_migrations creation
      mockSql.mockResolvedValueOnce({
        rows: [{ version: 1 }],
      }); // applied migrations query

      await runMigrations(mockSql);

      // Should not run migration 1 again
      const calls = mockSql.mock.calls;
      const migrationCalls = calls.filter((call: any[]) =>
        call[0]?.some?.((sql: any) =>
          typeof sql === "string" && sql.includes("CREATE TABLE IF NOT EXISTS fix_messages")
        )
      );
      expect(migrationCalls.length).toBe(0);
    });

    it("should record applied migrations", async () => {
      mockSql.mockResolvedValueOnce({ rows: [] }); // schema_migrations creation
      mockSql.mockResolvedValueOnce({ rows: [] }); // applied migrations query

      await runMigrations(mockSql);

      // Should insert into schema_migrations
      const calls = mockSql.mock.calls;
      const insertCalls = calls.filter((call: any[]) =>
        call[0]?.some?.((sql: any) =>
          typeof sql === "string" && sql.includes("INSERT INTO schema_migrations")
        )
      );
      expect(insertCalls.length).toBeGreaterThan(0);
    });

    it("should handle errors gracefully", async () => {
      mockSql.mockResolvedValueOnce({ rows: [] }); // schema_migrations creation
      mockSql.mockResolvedValueOnce({ rows: [] }); // applied migrations query
      mockSql.mockRejectedValueOnce(new Error("Migration error"));

      await expect(runMigrations(mockSql)).rejects.toThrow();
    });
  });

  describe("getCurrentMigrationVersion", () => {
    it("should return 0 if no migrations applied", async () => {
      mockSql.mockResolvedValueOnce({ rows: [] });

      const version = await getCurrentMigrationVersion(mockSql);

      expect(version).toBe(0);
    });

    it("should return highest version if migrations applied", async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{ max_version: 1 }],
      });

      const version = await getCurrentMigrationVersion(mockSql);

      expect(version).toBe(1);
    });

    it("should return 0 on error (table doesn't exist)", async () => {
      mockSql.mockRejectedValueOnce(new Error("Table doesn't exist"));

      const version = await getCurrentMigrationVersion(mockSql);

      expect(version).toBe(0);
    });
  });
});

