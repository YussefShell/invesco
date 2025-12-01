/**
 * Scheduled Reports Scheduler
 * 
 * This service automatically executes scheduled reports at their designated times.
 * It runs a check every minute to see if any reports are due for execution.
 * 
 * Usage:
 * - Import and call `startScheduledReportsScheduler()` when the application starts
 * - The scheduler will automatically check and execute reports every minute
 * - Reports are executed via API routes to ensure proper data access
 */

import { getExportService } from "./export-service";
import type { ScheduledReport } from "@/types/exports";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

/**
 * Start the scheduled reports scheduler
 * Checks every minute for reports that need to be executed
 */
export function startScheduledReportsScheduler(): void {
  if (isRunning) {
    console.log("[Scheduler] Already running, skipping start");
    return;
  }

  console.log("[Scheduler] Starting scheduled reports scheduler...");
  isRunning = true;

  // Check immediately on start
  checkAndExecuteReports();

  // Then check every minute
  schedulerInterval = setInterval(() => {
    checkAndExecuteReports();
  }, 60 * 1000); // 1 minute

  console.log("[Scheduler] Scheduler started - checking every minute for due reports");
}

/**
 * Stop the scheduled reports scheduler
 */
export function stopScheduledReportsScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    isRunning = false;
    console.log("[Scheduler] Stopped");
  }
}

/**
 * Check for reports that are due and execute them
 */
async function checkAndExecuteReports(): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    // Fetch reports from API to ensure we have the latest data
    let reports: ScheduledReport[] = [];
    try {
      const response = await fetch(`${baseUrl}/api/exports/scheduled-reports`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        reports = await response.json();
      } else {
        console.warn(`[Scheduler] Could not fetch scheduled reports: ${response.status}`);
        return;
      }
    } catch (error) {
      console.error(`[Scheduler] Error fetching scheduled reports:`, error);
      return;
    }

    const now = new Date();
    const dueReports = reports.filter((report) => {
      if (!report.enabled) return false;

      const nextRun = new Date(report.nextRun);
      return nextRun <= now;
    });

    if (dueReports.length === 0) {
      return; // No reports due
    }

    console.log(`[Scheduler] Found ${dueReports.length} report(s) due for execution`);

    // Execute all due reports via API
    try {
      const response = await fetch(`${baseUrl}/api/exports/scheduled-reports/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Empty body means execute all due reports
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[Scheduler] ✅ Executed ${result.executed || 0} report(s)`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to execute reports: ${response.status}`);
      }
    } catch (error) {
      console.error(`[Scheduler] Error executing reports:`, error);
    }
  } catch (error) {
    console.error("[Scheduler] Error checking reports:", error);
  }
}

/**
 * Execute a scheduled report
 * Uses the API route for execution to ensure proper server-side context
 */
async function executeReport(report: ScheduledReport): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  try {
    const response = await fetch(`${baseUrl}/api/exports/scheduled-reports/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: report.id }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to execute report: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[Scheduler] ✅ Report ${report.name} executed: ${result.message}`);
  } catch (error) {
    console.error(`[Scheduler] Error executing report ${report.id}:`, error);
    throw error;
  }
}


