/**
 * Execute Scheduled Reports API Route
 * 
 * This endpoint can be called to manually trigger execution of due reports,
 * or can be used by the scheduler service.
 */

import { NextRequest, NextResponse } from "next/server";
import { getExportService } from "@/lib/export-service";
import type { ScheduledReport } from "@/types/exports";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId } = body;

    const exportService = getExportService();

    // If reportId is provided, execute that specific report
    if (reportId) {
      const report = exportService.getScheduledReport(reportId);
      if (!report) {
        return NextResponse.json(
          { error: "Scheduled report not found" },
          { status: 404 }
        );
      }

      if (!report.enabled) {
        return NextResponse.json(
          { error: "Report is disabled" },
          { status: 400 }
        );
      }

      // Execute the report
      await executeReport(report, exportService);
      return NextResponse.json({ success: true, message: `Report ${reportId} executed` });
    }

    // Otherwise, execute all due reports
    const reports = exportService.getScheduledReports();
    const now = new Date();
    const dueReports = reports.filter((report) => {
      if (!report.enabled) return false;
      const nextRun = new Date(report.nextRun);
      return nextRun <= now;
    });

    if (dueReports.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No reports due for execution",
        executed: 0,
      });
    }

    // Execute each due report
    const results = [];
    for (const report of dueReports) {
      try {
        await executeReport(report, exportService);
        results.push({ reportId: report.id, status: "success" });
      } catch (error) {
        console.error(`Error executing report ${report.id}:`, error);
        exportService.updateScheduledReport(report.id, {
          lastError: error instanceof Error ? error.message : "Unknown error",
          errorCount: (report.errorCount || 0) + 1,
        });
        results.push({
          reportId: report.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Executed ${results.filter((r) => r.status === "success").length} of ${results.length} reports`,
      executed: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (error) {
    console.error("[exports/scheduled-reports/execute] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details.",
      },
      { status: 500 }
    );
  }
}

/**
 * Execute a scheduled report
 */
async function executeReport(
  report: ScheduledReport,
  exportService: ReturnType<typeof getExportService>
): Promise<void> {
  console.log(`[Scheduler] Executing report: ${report.name} (${report.id})`);

  // Get holdings data from the market data API
  let holdings: any[] = [];
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/market-data`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const data = await response.json();
      holdings = data.holdings || [];
    } else {
      console.warn(`[Scheduler] Could not fetch holdings data: ${response.status}`);
    }
  } catch (error) {
    console.error(`[Scheduler] Error fetching holdings data:`, error);
    // Continue with empty holdings - export will still be created
  }

  // Generate the export
  const exportJob = await exportService.exportData(holdings, report.exportOptions);

  // Update report with success
  const updatedReport = exportService.updateScheduledReport(report.id, {
    lastRun: new Date().toISOString(),
    nextRun: calculateNextRun(report.schedule),
    runCount: (report.runCount || 0) + 1,
    lastError: undefined, // Clear any previous errors
  });

  if (!updatedReport) {
    throw new Error("Failed to update report after execution");
  }

  // Send report to recipients via email
  if (report.recipients && report.recipients.length > 0 && exportJob.fileUrl) {
    await sendReportToRecipients(report, exportJob);
  }

  console.log(`[Scheduler] ✅ Report ${report.name} executed successfully. Next run: ${updatedReport.nextRun}`);
}

/**
 * Send report to recipients via email
 */
async function sendReportToRecipients(
  report: ScheduledReport,
  exportJob: any
): Promise<void> {
  const recipients = report.recipients || [];
  if (recipients.length === 0) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const subject = `${report.name} - ${new Date().toLocaleDateString()}`;
  const body = `
${report.description || "Scheduled report"}

Report Details:
- Format: ${exportJob.format.toUpperCase()}
- Records: ${exportJob.recordCount || 0}
- File Size: ${formatFileSize(exportJob.fileSize || 0)}
- Generated: ${new Date(exportJob.createdAt).toLocaleString()}

The report file is attached to this email.

This is an automated message from the Invesco Regulatory Risk Management System.
  `.trim();

  // Send email to each recipient
  for (const recipient of recipients) {
    try {
      const response = await fetch(`${baseUrl}/api/notifications/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject,
          body,
          html: `
            <html>
              <body>
                <h2>${report.name}</h2>
                <p>${report.description || "Scheduled report"}</p>
                <table style="border-collapse: collapse; margin: 20px 0;">
                  <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Format:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${exportJob.format.toUpperCase()}</td></tr>
                  <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Records:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${exportJob.recordCount || 0}</td></tr>
                  <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>File Size:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${formatFileSize(exportJob.fileSize || 0)}</td></tr>
                  <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Generated:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${new Date(exportJob.createdAt).toLocaleString()}</td></tr>
                </table>
                <p><em>Note: The report file is attached to this email.</em></p>
                <p style="color: #666; font-size: 12px;">This is an automated message from the Invesco Regulatory Risk Management System.</p>
              </body>
            </html>
          `,
        }),
      });

      if (response.ok) {
        console.log(`[Scheduler] Report sent to ${recipient}`);
      } else {
        console.warn(`[Scheduler] Failed to send report to ${recipient}: ${response.status}`);
      }
    } catch (error) {
      console.error(`[Scheduler] Error sending report to ${recipient}:`, error);
    }
  }
}

/**
 * Calculate next run time for a schedule
 */
function calculateNextRun(schedule: ScheduledReport["schedule"]): string {
  const now = new Date();
  const [hours, minutes] = schedule.time.split(":").map(Number);
  const nextRun = new Date();

  nextRun.setHours(hours, minutes, 0, 0);

  switch (schedule.frequency) {
    case "daily":
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    case "weekly":
      if (schedule.dayOfWeek !== undefined) {
        const daysUntilNext = (schedule.dayOfWeek - nextRun.getDay() + 7) % 7;
        if (daysUntilNext === 0 && nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7);
        } else {
          nextRun.setDate(nextRun.getDate() + daysUntilNext);
        }
      }
      break;
    case "monthly":
      if (schedule.dayOfMonth !== undefined) {
        nextRun.setDate(schedule.dayOfMonth);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
      }
      break;
    case "custom":
      nextRun.setDate(nextRun.getDate() + 1);
      break;
  }

  return nextRun.toISOString();
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

