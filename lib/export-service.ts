import type {
  ExportFormat,
  ExportOptions,
  ExportJob,
  ScheduledReport,
  ReportSchedule,
} from "@/types/exports";
import type { Holding } from "@/types";

export class ExportService {
  private exportJobs: Map<string, ExportJob> = new Map();
  private scheduledReports: Map<string, ScheduledReport> = new Map();

  constructor() {
    this.initializeDefaultScheduledReports();
  }

  private initializeDefaultScheduledReports() {
    const defaultReports: ScheduledReport[] = [
      {
        id: "daily-risk-summary",
        name: "Daily Risk Summary",
        description: "Daily summary of all regulatory breaches and warnings",
        enabled: true,
        schedule: {
          frequency: "daily",
          time: "08:00",
        },
        exportOptions: {
          format: "excel",
          scope: "all",
        },
        recipients: ["risk.head@invesco.com", "compliance@invesco.com"],
        nextRun: this.calculateNextRun({
          frequency: "daily",
          time: "08:00",
        }),
        runCount: 0,
        errorCount: 0,
      },
      {
        id: "weekly-compliance-report",
        name: "Weekly Compliance Report",
        description: "Weekly comprehensive compliance report",
        enabled: true,
        schedule: {
          frequency: "weekly",
          time: "09:00",
          dayOfWeek: 1, // Monday
        },
        exportOptions: {
          format: "pdf",
          scope: "all",
        },
        recipients: ["compliance@invesco.com"],
        nextRun: this.calculateNextRun({
          frequency: "weekly",
          time: "09:00",
          dayOfWeek: 1,
        }),
        runCount: 0,
        errorCount: 0,
      },
    ];

    defaultReports.forEach((report) => {
      this.scheduledReports.set(report.id, report);
    });
  }

  // Export holdings data
  async exportData(
    holdings: Holding[],
    options: ExportOptions
  ): Promise<ExportJob> {
    const jobId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job: ExportJob = {
      id: jobId,
      status: "processing",
      format: options.format,
      createdAt: new Date().toISOString(),
    };

    this.exportJobs.set(jobId, job);

    try {
      // Filter holdings based on scope and filters
      let filteredHoldings = this.filterHoldings(holdings, options);

      // Generate export file based on format
      let fileContent: string;
      let mimeType: string;
      let fileName: string;

      switch (options.format) {
        case "csv":
          fileContent = this.generateCSV(filteredHoldings, options);
          mimeType = "text/csv";
          fileName = `holdings-export-${Date.now()}.csv`;
          break;
        case "excel":
          // For Excel, we'll generate CSV format (can be opened in Excel)
          // In production, use a library like exceljs or xlsx for proper XLSX format
          fileContent = this.generateCSV(filteredHoldings, options);
          mimeType = "text/csv";
          fileName = `holdings-export-${Date.now()}.csv`;
          break;
        case "json":
          fileContent = JSON.stringify(filteredHoldings, null, 2);
          mimeType = "application/json";
          fileName = `holdings-export-${Date.now()}.json`;
          break;
        case "pdf":
          // PDF generation would use the existing filing-pdf.ts logic
          // For now, return a placeholder
          fileContent = "PDF export not yet implemented";
          mimeType = "application/pdf";
          fileName = `holdings-export-${Date.now()}.pdf`;
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Create base64 data URL for server-side (works in both Node.js and browser)
      const base64 = typeof Buffer !== 'undefined' 
        ? Buffer.from(fileContent).toString('base64')
        : btoa(unescape(encodeURIComponent(fileContent)));
      const fileUrl = `data:${mimeType};base64,${base64}`;
      const fileSize = new TextEncoder().encode(fileContent).length;

      job.status = "completed";
      job.completedAt = new Date().toISOString();
      job.fileUrl = fileUrl;
      job.fileSize = fileSize;
      job.recordCount = filteredHoldings.length;

      this.exportJobs.set(jobId, job);
      return job;
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : "Unknown error";
      this.exportJobs.set(jobId, job);
      throw error;
    }
  }

  private filterHoldings(holdings: Holding[], options: ExportOptions): Holding[] {
    let filtered = [...holdings];

    if (options.filters) {
      for (const filter of options.filters) {
        filtered = filtered.filter((holding) => {
          const value = this.getFieldValue(holding, filter.field);
          return this.evaluateFilter(filter, value);
        });
      }
    }

    if (options.dateRange) {
      filtered = filtered.filter((holding) => {
        const lastUpdated = new Date(holding.lastUpdated);
        const start = new Date(options.dateRange!.start);
        const end = new Date(options.dateRange!.end);
        return lastUpdated >= start && lastUpdated <= end;
      });
    }

    return filtered;
  }

  private getFieldValue(holding: Holding, field: string): any {
    switch (field) {
      case "ticker":
        return holding.ticker;
      case "issuer":
        return holding.issuer;
      case "jurisdiction":
        return holding.jurisdiction;
      case "ownershipPercent":
        return (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
      case "sharesOwned":
        return holding.sharesOwned;
      case "buyingVelocity":
        return holding.buyingVelocity;
      default:
        return null;
    }
  }

  private evaluateFilter(filter: any, value: any): boolean {
    switch (filter.operator) {
      case "equals":
        return value === filter.value;
      case "greater_than":
        return Number(value) > Number(filter.value);
      case "less_than":
        return Number(value) < Number(filter.value);
      case "in":
        return Array.isArray(filter.value) && filter.value.includes(value);
      case "contains":
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      default:
        return false;
    }
  }

  private generateCSV(holdings: Holding[], options: ExportOptions): string {
    const columns = options.includeColumns || [
      "ticker",
      "issuer",
      "isin",
      "jurisdiction",
      "ownershipPercent",
      "sharesOwned",
      "totalSharesOutstanding",
      "buyingVelocity",
      "threshold",
      "lastUpdated",
    ];

    // CSV header
    const header = columns.join(",");

    // CSV rows
    const rows = holdings.map((holding) => {
      const ownershipPercent =
        (holding.sharesOwned / holding.totalSharesOutstanding) * 100;

      return columns
        .map((col) => {
          switch (col) {
            case "ticker":
              return holding.ticker;
            case "issuer":
              return `"${holding.issuer}"`;
            case "isin":
              return holding.isin;
            case "jurisdiction":
              return holding.jurisdiction;
            case "ownershipPercent":
              return ownershipPercent.toFixed(2);
            case "sharesOwned":
              return holding.sharesOwned.toLocaleString();
            case "totalSharesOutstanding":
              return holding.totalSharesOutstanding.toLocaleString();
            case "buyingVelocity":
              return holding.buyingVelocity.toLocaleString();
            case "threshold":
              return holding.regulatoryRule.threshold.toFixed(2);
            case "lastUpdated":
              return holding.lastUpdated;
            default:
              return "";
          }
        })
        .join(",");
    });

    return [header, ...rows].join("\n");
  }

  // Scheduled reports management
  getScheduledReports(): ScheduledReport[] {
    return Array.from(this.scheduledReports.values());
  }

  getScheduledReport(id: string): ScheduledReport | undefined {
    return this.scheduledReports.get(id);
  }

  createScheduledReport(
    report: Omit<ScheduledReport, "id" | "nextRun" | "runCount" | "errorCount">
  ): ScheduledReport {
    const newReport: ScheduledReport = {
      ...report,
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nextRun: this.calculateNextRun(report.schedule),
      runCount: 0,
      errorCount: 0,
    };
    this.scheduledReports.set(newReport.id, newReport);
    return newReport;
  }

  updateScheduledReport(
    id: string,
    updates: Partial<ScheduledReport>
  ): ScheduledReport | null {
    const report = this.scheduledReports.get(id);
    if (!report) return null;

    const updated = { ...report, ...updates };
    if (updates.schedule) {
      updated.nextRun = this.calculateNextRun(updated.schedule);
    }
    this.scheduledReports.set(id, updated);
    return updated;
  }

  deleteScheduledReport(id: string): boolean {
    return this.scheduledReports.delete(id);
  }

  private calculateNextRun(schedule: ReportSchedule): string {
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
        // For custom cron expressions, would need a cron parser
        nextRun.setDate(nextRun.getDate() + 1);
        break;
    }

    return nextRun.toISOString();
  }

  // Get export job status
  getExportJob(id: string): ExportJob | undefined {
    return this.exportJobs.get(id);
  }

  getExportJobs(limit: number = 50): ExportJob[] {
    return Array.from(this.exportJobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}

// Singleton instance
let exportServiceInstance: ExportService | null = null;

export function getExportService(): ExportService {
  if (!exportServiceInstance) {
    exportServiceInstance = new ExportService();
  }
  return exportServiceInstance;
}

