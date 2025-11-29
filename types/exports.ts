export type ExportFormat = "csv" | "excel" | "json" | "pdf";

export type ExportScope = "all" | "filtered" | "selected";

export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  includeColumns?: string[];
  filters?: ExportFilter[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ExportFilter {
  field: string;
  operator: "equals" | "greater_than" | "less_than" | "in" | "contains";
  value: string | number | string[];
}

export interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  schedule: ReportSchedule;
  exportOptions: ExportOptions;
  recipients: string[]; // Email addresses
  lastRun?: string;
  nextRun: string;
  runCount: number;
  errorCount: number;
  lastError?: string;
}

export interface ReportSchedule {
  frequency: "daily" | "weekly" | "monthly" | "custom";
  time: string; // HH:mm format
  dayOfWeek?: number; // 0-6 for weekly (0 = Sunday)
  dayOfMonth?: number; // 1-31 for monthly
  cronExpression?: string; // For custom schedules
}

export interface ExportJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  format: ExportFormat;
  createdAt: string;
  completedAt?: string;
  fileUrl?: string;
  fileSize?: number;
  error?: string;
  recordCount?: number;
}

