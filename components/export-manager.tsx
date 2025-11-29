"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type {
  ExportFormat,
  ExportOptions,
  ExportJob,
  ScheduledReport,
  ExportScope,
} from "@/types/exports";
import type { Holding } from "@/types";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { usePortfolio } from "@/components/PortfolioContext";

export default function ExportManager() {
  const { holdings } = usePortfolio();
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ScheduledReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadExportJobs();
    loadScheduledReports();
  }, []);

  const loadExportJobs = async () => {
    try {
      const response = await fetch("/api/exports?limit=20");
      const data = await response.json();
      setExportJobs(data || []);
    } catch (error) {
      console.error("Failed to load export jobs:", error);
    }
  };

  const loadScheduledReports = async () => {
    try {
      const response = await fetch("/api/exports/scheduled-reports");
      const data = await response.json();
      setScheduledReports(data || []);
    } catch (error) {
      console.error("Failed to load scheduled reports:", error);
    }
  };

  const handleExport = async (options: ExportOptions) => {
    setLoading(true);
    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          options,
          holdings,
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const job = await response.json();
      setExportJobs((prev) => [job, ...prev]);
      setIsExportDialogOpen(false);

      // Poll for job completion
      pollJobStatus(job.id);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/exports/jobs/${jobId}`);
        const job = await response.json();

        setExportJobs((prev) =>
          prev.map((j) => (j.id === jobId ? job : j))
        );

        if (job.status === "completed" && job.fileUrl) {
          // Download the file
          const link = document.createElement("a");
          link.href = job.fileUrl;
          link.download = `export-${jobId}.${job.format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (job.status === "failed") {
          alert(`Export failed: ${job.error}`);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 1000);
        }
      } catch (error) {
        console.error("Failed to poll job status:", error);
      }
    };

    poll();
  };

  const deleteScheduledReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this scheduled report?"))
      return;

    try {
      await fetch(`/api/exports/scheduled-reports/${reportId}`, {
        method: "DELETE",
      });
      loadScheduledReports();
    } catch (error) {
      console.error("Failed to delete report:", error);
    }
  };

  const toggleScheduledReport = async (
    reportId: string,
    enabled: boolean
  ) => {
    try {
      await fetch(`/api/exports/scheduled-reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      loadScheduledReports();
    } catch (error) {
      console.error("Failed to toggle report:", error);
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case "csv":
      case "excel":
        return <FileSpreadsheet className="w-4 h-4" />;
      case "pdf":
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getJobStatusIcon = (status: ExportJob["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Data Export & Reports
              </CardTitle>
              <CardDescription>
                Export portfolio data and manage scheduled reports
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedReport(null);
                  setIsReportDialogOpen(true);
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Report
              </Button>
              <Button
                size="sm"
                onClick={() => setIsExportDialogOpen(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Scheduled Reports */}
            <div>
              <h3 className="font-semibold mb-3">Scheduled Reports</h3>
              {scheduledReports.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No scheduled reports. Create one to automate exports.
                </div>
              ) : (
                <div className="space-y-2">
                  {scheduledReports.map((report) => (
                    <div
                      key={report.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{report.name}</h4>
                            <Badge
                              variant={report.enabled ? "default" : "secondary"}
                            >
                              {report.enabled ? "Active" : "Disabled"}
                            </Badge>
                            <Badge variant="outline">
                              {getFormatIcon(report.exportOptions.format)}
                              {report.exportOptions.format.toUpperCase()}
                            </Badge>
                          </div>
                          {report.description && (
                            <p className="text-sm text-muted-foreground">
                              {report.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              Schedule: {report.schedule.frequency} at{" "}
                              {report.schedule.time}
                            </span>
                            <span>
                              Next run:{" "}
                              {new Date(report.nextRun).toLocaleString()}
                            </span>
                            <span>Runs: {report.runCount}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleScheduledReport(report.id, !report.enabled)
                            }
                          >
                            {report.enabled ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report);
                              setIsReportDialogOpen(true);
                            }}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteScheduledReport(report.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Exports */}
            <div>
              <h3 className="font-semibold mb-3">Recent Exports</h3>
              {exportJobs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No exports yet. Click &quot;Export Data&quot; to create one.
                </div>
              ) : (
                <div className="space-y-2">
                  {exportJobs.map((job) => (
                    <div
                      key={job.id}
                      className="border rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {getJobStatusIcon(job.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              Export ({job.format.toUpperCase()})
                            </span>
                            <Badge variant="outline">
                              {getFormatIcon(job.format)}
                              {job.format}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Created: {new Date(job.createdAt).toLocaleString()}
                            {job.recordCount && (
                              <span className="ml-2">
                                • {job.recordCount.toLocaleString()} records
                              </span>
                            )}
                            {job.fileSize && (
                              <span className="ml-2">
                                • {(job.fileSize / 1024).toFixed(2)} KB
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.status === "completed" && job.fileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = job.fileUrl!;
                              link.download = `export-${job.id}.${job.format}`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        )}
                        {job.status === "processing" && (
                          <span className="text-xs text-muted-foreground">
                            Processing...
                          </span>
                        )}
                        {job.status === "failed" && (
                          <span className="text-xs text-red-500">
                            Failed: {job.error}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Dialog */}
      {isExportDialogOpen && (
        <ExportDialog
          open={isExportDialogOpen}
          onOpenChange={setIsExportDialogOpen}
          onExport={handleExport}
          loading={loading}
        />
      )}

      {/* Scheduled Report Dialog */}
      {isReportDialogOpen && (
        <ScheduledReportDialog
          report={selectedReport}
          open={isReportDialogOpen}
          onOpenChange={setIsReportDialogOpen}
          onSave={loadScheduledReports}
        />
      )}
    </div>
  );
}

function ExportDialog({
  open,
  onOpenChange,
  onExport,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => void;
  loading: boolean;
}) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [scope, setScope] = useState<ExportScope>("all");

  const handleExport = () => {
    onExport({
      format,
      scope,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Choose export format and scope for your portfolio data
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Export Format</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                <SelectItem value="excel">Excel (XLSX)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Export Scope</Label>
            <Select
              value={scope}
              onValueChange={(value) => setScope(value as ExportScope)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Holdings</SelectItem>
                <SelectItem value="filtered">Filtered Holdings</SelectItem>
                <SelectItem value="selected">Selected Holdings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScheduledReportDialog({
  report,
  open,
  onOpenChange,
  onSave,
}: {
  report: ScheduledReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(report?.name || "");
  const [description, setDescription] = useState(report?.description || "");
  const [enabled, setEnabled] = useState(report?.enabled ?? true);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(
    (report?.schedule.frequency === "custom" ? "daily" : report?.schedule.frequency) || "daily"
  );
  const [time, setTime] = useState(report?.schedule.time || "08:00");
  const [format, setFormat] = useState<ExportFormat>(
    report?.exportOptions.format || "excel"
  );
  const [recipients, setRecipients] = useState(
    report?.recipients.join(", ") || ""
  );

  const handleSave = async () => {
    try {
      const reportData = {
        name,
        description,
        enabled,
        schedule: {
          frequency,
          time,
        },
        exportOptions: {
          format,
          scope: "all" as const,
        },
        recipients: recipients
          .split(",")
          .map((r) => r.trim())
          .filter((r) => r.length > 0),
      };

      if (report) {
        await fetch(`/api/exports/scheduled-reports/${report.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reportData),
        });
      } else {
        await fetch("/api/exports/scheduled-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reportData),
        });
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save report:", error);
      alert("Failed to save scheduled report");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {report ? "Edit Scheduled Report" : "Create Scheduled Report"}
          </DialogTitle>
          <DialogDescription>
            Configure automated reports that will be generated and sent on a schedule
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Report Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily Risk Summary"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div>
            <Label>Export Format</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Frequency</Label>
            <Select
              value={frequency}
              onValueChange={(value) =>
                setFrequency(value as "daily" | "weekly" | "monthly")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Time</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div>
            <Label>Recipients (comma-separated email addresses)</Label>
            <Input
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <Label htmlFor="enabled">Enable this report</Label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Report</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

