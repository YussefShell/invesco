import type {
  ExportFormat,
  ExportOptions,
  ExportJob,
  ScheduledReport,
  ReportSchedule,
} from "@/types/exports";
import type { Holding } from "@/types";
import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
      let fileContent: string | Uint8Array;
      let mimeType: string;
      let fileName: string;

      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      switch (options.format) {
        case "csv":
          fileContent = this.generateCSV(filteredHoldings, options);
          mimeType = "text/csv;charset=utf-8";
          fileName = `Invesco-Portfolio-Holdings-${timestamp}.csv`;
          break;
        case "excel":
          fileContent = await this.generateExcel(filteredHoldings, options);
          mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          fileName = `Invesco-Portfolio-Holdings-${timestamp}.xlsx`;
          break;
        case "json":
          fileContent = this.generateJSON(filteredHoldings, options);
          mimeType = "application/json;charset=utf-8";
          fileName = `Invesco-Portfolio-Holdings-${timestamp}.json`;
          break;
        case "pdf":
          fileContent = await this.generatePDF(filteredHoldings, options);
          mimeType = "application/pdf";
          fileName = `Invesco-Portfolio-Holdings-${timestamp}.pdf`;
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Create base64 data URL for server-side (works in both Node.js and browser)
      let base64: string;
      if (fileContent instanceof Uint8Array) {
        // Binary data (PDF, XLSX)
        base64 = typeof Buffer !== 'undefined'
          ? Buffer.from(fileContent).toString('base64')
          : btoa(String.fromCharCode(...fileContent));
      } else {
        // Text data (CSV, JSON)
        base64 = typeof Buffer !== 'undefined'
          ? Buffer.from(fileContent, 'utf-8').toString('base64')
          : btoa(unescape(encodeURIComponent(fileContent)));
      }
      
      const fileUrl = `data:${mimeType};base64,${base64}`;
      const fileSize = fileContent instanceof Uint8Array 
        ? fileContent.length 
        : new TextEncoder().encode(fileContent).length;

      job.status = "completed";
      job.completedAt = new Date().toISOString();
      job.fileUrl = fileUrl;
      job.fileName = fileName;
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
    // Professional CSV with proper headers
    const headers = [
      "Ticker",
      "Issuer",
      "ISIN",
      "Jurisdiction",
      "Ownership %",
      "Shares Owned",
      "Total Shares Outstanding",
      "Buying Velocity (shares/hour)",
      "Regulatory Threshold %",
      "Regulatory Rule",
      "Last Updated",
    ];

    // Add BOM for Excel UTF-8 support
    const BOM = "\uFEFF";
    const headerRow = BOM + headers.join(",");

    const rows = holdings.map((holding) => {
      const ownershipPercent =
        (holding.sharesOwned / holding.totalSharesOutstanding) * 100;

      // Escape commas and quotes in CSV
      const escapeCSV = (value: string | number): string => {
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return [
        escapeCSV(holding.ticker),
        escapeCSV(holding.issuer),
        escapeCSV(holding.isin),
        escapeCSV(holding.jurisdiction),
        ownershipPercent.toFixed(2),
        holding.sharesOwned.toLocaleString(),
        holding.totalSharesOutstanding.toLocaleString(),
        holding.buyingVelocity.toLocaleString(),
        holding.regulatoryRule.threshold.toFixed(2),
        escapeCSV(holding.regulatoryRule.name),
        new Date(holding.lastUpdated).toLocaleString(),
      ].join(",");
    });

    return [headerRow, ...rows].join("\n");
  }

  private async generateExcel(holdings: Holding[], options: ExportOptions): Promise<Uint8Array> {
    // Prepare data for Excel
    const worksheetData = holdings.map((holding) => {
      const ownershipPercent =
        (holding.sharesOwned / holding.totalSharesOutstanding) * 100;

      return {
        "Ticker": holding.ticker,
        "Issuer": holding.issuer,
        "ISIN": holding.isin,
        "Jurisdiction": holding.jurisdiction,
        "Ownership %": parseFloat(ownershipPercent.toFixed(2)),
        "Shares Owned": holding.sharesOwned,
        "Total Shares Outstanding": holding.totalSharesOutstanding,
        "Buying Velocity (shares/hour)": holding.buyingVelocity,
        "Regulatory Threshold %": holding.regulatoryRule.threshold,
        "Regulatory Rule": holding.regulatoryRule.name,
        "Regulatory Code": holding.regulatoryRule.code,
        "Last Updated": new Date(holding.lastUpdated),
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Ticker
      { wch: 30 }, // Issuer
      { wch: 15 }, // ISIN
      { wch: 15 }, // Jurisdiction
      { wch: 15 }, // Ownership %
      { wch: 18 }, // Shares Owned
      { wch: 25 }, // Total Shares Outstanding
      { wch: 25 }, // Buying Velocity
      { wch: 22 }, // Regulatory Threshold %
      { wch: 25 }, // Regulatory Rule
      { wch: 18 }, // Regulatory Code
      { wch: 20 }, // Last Updated
    ];
    worksheet["!cols"] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Portfolio Holdings");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      compression: true,
    });

    return new Uint8Array(excelBuffer);
  }

  private generateJSON(holdings: Holding[], options: ExportOptions): string {
    // Professional JSON export with metadata
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportFormat: "JSON",
        recordCount: holdings.length,
        generatedBy: "Invesco Regulatory Risk Management System",
        version: "1.0",
      },
      holdings: holdings.map((holding) => {
        const ownershipPercent =
          (holding.sharesOwned / holding.totalSharesOutstanding) * 100;

        return {
          id: holding.id,
          ticker: holding.ticker,
          issuer: holding.issuer,
          isin: holding.isin,
          jurisdiction: holding.jurisdiction,
          ownership: {
            percentage: parseFloat(ownershipPercent.toFixed(4)),
            sharesOwned: holding.sharesOwned,
            totalSharesOutstanding: holding.totalSharesOutstanding,
          },
          buyingVelocity: holding.buyingVelocity,
          regulatory: {
            ruleCode: holding.regulatoryRule.code,
            ruleName: holding.regulatoryRule.name,
            threshold: holding.regulatoryRule.threshold,
            jurisdiction: holding.regulatoryRule.jurisdiction,
          },
          lastUpdated: holding.lastUpdated,
          price: holding.price,
          fundId: holding.fundId,
          parentId: holding.parentId,
        };
      }),
    };

    return JSON.stringify(exportData, null, 2);
  }

  private async generatePDF(holdings: Holding[], options: ExportOptions): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const tableStartY = pageHeight - 100;
    let currentY = tableStartY;
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);

    // Header
    currentPage.drawText("Invesco Portfolio Holdings Report", {
      x: margin,
      y: pageHeight - 40,
      size: 16,
      font: boldFont,
      color: rgb(0.07, 0.11, 0.2),
    });

    currentPage.drawText(
      `Generated: ${new Date().toLocaleString()} | Total Holdings: ${holdings.length}`,
      {
        x: margin,
        y: pageHeight - 60,
        size: 10,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      }
    );

    // Table headers
    const headers = ["Ticker", "Issuer", "Jurisdiction", "Ownership %", "Threshold %", "Rule"];
    const colWidths = [60, 150, 80, 70, 70, 100];
    let colX = margin;

    currentY = tableStartY - 20;
    headers.forEach((header, index) => {
      currentPage.drawText(header, {
        x: colX,
        y: currentY,
        size: 9,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      colX += colWidths[index];
    });

    // Draw header line (using rectangle as line)
    currentPage.drawRectangle({
      x: margin,
      y: currentY - 6,
      width: pageWidth - margin * 2,
      height: 1,
      color: rgb(0, 0, 0),
    });

    currentY -= 20;
    const rowHeight = 15;
    const minY = margin + 30;

    // Table rows
    holdings.forEach((holding, index) => {
      // Check if we need a new page
      if (currentY < minY) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - 60;

        // Redraw headers on new page
        colX = margin;
        headers.forEach((header, idx) => {
          currentPage.drawText(header, {
            x: colX,
            y: currentY,
            size: 9,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          colX += colWidths[idx];
        });

        currentPage.drawRectangle({
          x: margin,
          y: currentY - 6,
          width: pageWidth - margin * 2,
          height: 1,
          color: rgb(0, 0, 0),
        });

        currentY -= 20;
      }

      const ownershipPercent =
        (holding.sharesOwned / holding.totalSharesOutstanding) * 100;

      const rowData = [
        holding.ticker,
        holding.issuer.length > 25 ? holding.issuer.substring(0, 22) + "..." : holding.issuer,
        holding.jurisdiction,
        ownershipPercent.toFixed(2) + "%",
        holding.regulatoryRule.threshold.toFixed(2) + "%",
        holding.regulatoryRule.code,
      ];

      colX = margin;
      rowData.forEach((cell, cellIndex) => {
        currentPage.drawText(cell, {
          x: colX + 2,
          y: currentY - 10,
          size: 8,
          font: font,
          color: rgb(0, 0, 0),
          maxWidth: colWidths[cellIndex] - 4,
        });
        colX += colWidths[cellIndex];
      });

      // Draw row line (using rectangle as line)
      currentPage.drawRectangle({
        x: margin,
        y: currentY - rowHeight + 1,
        width: pageWidth - margin * 2,
        height: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      currentY -= rowHeight;
    });

    // Footer on last page
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    lastPage.drawText(
      `Page ${pages.length} of ${pages.length} | Confidential - Invesco Internal Use Only`,
      {
        x: margin,
        y: 30,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      }
    );

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
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

