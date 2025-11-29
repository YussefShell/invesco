"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortfolio } from "@/components/contexts/PortfolioContext";
import { formatDurationFromHours } from "@/lib/mock-data";
import { useRiskCalculator } from "@/lib/use-risk-calculator";
import { calculateDeltaAdjustedExposure } from "@/lib/calculation-utils";
import { generate13FPdfDraft } from "@/lib/filing-pdf";
import { calculateBusinessDeadline } from "@/lib/compliance-rules-engine";
import { FileText, CheckCircle2, Clock, AlertCircle, Database } from "lucide-react";

interface CompliancePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FilingStep = "idle" | "gathering" | "validating" | "ready";
type FilingProgress = {
  step: FilingStep;
  progress: number;
  message: string;
};

export default function CompliancePanel({ open, onOpenChange }: CompliancePanelProps) {
  const [filingProgress, setFilingProgress] = useState<FilingProgress>({
    step: "idle",
    progress: 0,
    message: "",
  });
  const { selectedTicker } = usePortfolio();
  const { holding, breach, compliance, ownershipPercent, hasDataQualityWarning, totalExposure } = useRiskCalculator(
    selectedTicker
  );

  useEffect(() => {
    if (!open) {
      // Reset progress when panel closes
      setFilingProgress({
        step: "idle",
        progress: 0,
        message: "",
      });
    }
  }, [open]);

  const generateFiling = () => {
    setFilingProgress({
      step: "gathering",
      progress: 0,
      message: "Gathering Custodian Data",
    });

    // Simulate step 1: Gathering Custodian Data (0-33%)
    let progress = 0;
    const interval1 = setInterval(() => {
      progress += 2;
      if (progress >= 33) {
        clearInterval(interval1);
        setFilingProgress({
          step: "validating",
          progress: 33,
          message: "Validating Legal Entity",
        });

        // Simulate step 2: Validating Legal Entity (33-66%)
        const interval2 = setInterval(() => {
          progress += 2;
          if (progress >= 66) {
            clearInterval(interval2);
            setFilingProgress({
              step: "ready",
              progress: 100,
              message: "Draft Ready",
            });
          } else {
            setFilingProgress((prev) => ({
              ...prev,
              progress,
            }));
          }
        }, 100);
      } else {
        setFilingProgress((prev) => ({
          ...prev,
          progress,
        }));
      }
    }, 100);
  };

  if (!holding || !breach || ownershipPercent == null) return null;

  // Format Flash Recon timestamp for display
  const formatReconTimestamp = (timestamp?: string): string => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return "N/A";
    }
  };

  const reconDisplay = holding.lastReconTimestamp && holding.reconStatus
    ? `Last Ledger Check: ${formatReconTimestamp(holding.lastReconTimestamp)} (${holding.reconStatus})`
    : null;

  const deadlineDisplay =
    compliance && compliance.deadlineDays
      ? (() => {
          const { date, adjustedForHoliday } = calculateBusinessDeadline(
            new Date(),
            compliance.deadlineDays,
            holding.jurisdiction
          );
          // Use UTC to avoid timezone-related hydration issues
          const day = String(date.getUTCDate()).padStart(2, "0");
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const month = monthNames[date.getUTCMonth()];
          const year = date.getUTCFullYear();
          const formatted = `${day} ${month} ${year}`;
          const note =
            adjustedForHoliday && holding.jurisdiction === "UK"
              ? " (Adj. for UK Holiday)"
              : "";
          return `${formatted}${note}`;
        })()
      : compliance?.deadline ?? "N/A";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Compliance Officer Workflow</SheetTitle>
          <SheetDescription>
            Regulatory rule breakdown and filing generation for {holding.issuer} (
            {holding.ticker})
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Flash Recon Indicator */}
          {reconDisplay && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Reconciliation Status</span>
                  </div>
                  <Badge
                    variant={holding.reconStatus === "MATCH" ? "success" : "warning"}
                    className="gap-1"
                  >
                    {holding.reconStatus === "MATCH" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {reconDisplay}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Quality Warning */}
          {hasDataQualityWarning && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.7, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative"
                  >
                    <span className="absolute inline-flex h-3 w-3 rounded-full bg-yellow-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-500" />
                  </motion.div>
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-600 dark:text-yellow-400">
                      DATA QUALITY WARNING
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Bloomberg and Refinitiv data sources differ by more than 1%. Auto-filing is disabled until data quality is resolved.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Position Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Position Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Issuer</p>
                  <p className="font-semibold">{holding.issuer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ISIN</p>
                  <p className="font-mono text-xs">{holding.isin}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jurisdiction</p>
                  <p className="font-semibold">{holding.jurisdiction}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Position</p>
                  <p className="font-mono font-semibold">
                    {ownershipPercent.toFixed(2)}%
                  </p>
                  {totalExposure !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Total Exposure: {totalExposure.toLocaleString()} shares
                      {holding.derivativePositions && holding.derivativePositions.length > 0 && (
                        <span className="block mt-0.5">
                          (incl. {holding.derivativePositions.reduce((sum, p) => sum + (p.contracts * 100 * p.delta), 0).toLocaleString()} from options)
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Threshold</p>
                  <p className="font-mono font-semibold">
                    {holding.regulatoryRule.threshold.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Shares Outstanding</p>
                  <p className="font-mono text-sm">
                    {holding.totalSharesOutstanding.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </p>
                  {(holding.totalShares_Bloomberg || holding.totalShares_Refinitiv) && (
                    <div className="mt-1 space-y-0.5">
                      {holding.totalShares_Bloomberg && (
                        <p className="text-xs text-muted-foreground">
                          Bloomberg: {holding.totalShares_Bloomberg.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </p>
                      )}
                      {holding.totalShares_Refinitiv && (
                        <p className="text-xs text-muted-foreground">
                          Refinitiv: {holding.totalShares_Refinitiv.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Buying Velocity</p>
                  <p className="font-mono font-semibold">
                    {holding.buyingVelocity.toLocaleString()} shares/hr
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rule Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rule Breakdown</CardTitle>
              <CardDescription>
                Regulatory requirement details and compliance status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-sm">
                    {holding.regulatoryRule.code}
                  </Badge>
                  {breach && (
                    <Badge
                      variant={
                        breach.status === "breach"
                          ? "destructive"
                          : breach.status === "warning"
                          ? "warning"
                          : "success"
                      }
                    >
                      {breach.status.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold mb-1">
                  {holding.regulatoryRule.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {holding.regulatoryRule.description}
                </p>
              </div>

              {(breach || compliance) && (
                <div className="pt-4 border-t border-border space-y-3">
                  {breach && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-semibold">
                          {breach.timeToBreach}
                        </span>
                      </div>
                      {breach.projectedBreachTime !== null && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Projected Breach Time:
                          </span>
                          <span className="font-mono font-semibold">
                            {formatDurationFromHours(
                              breach.projectedBreachTime
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {compliance && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Required Filing:
                        </span>
                        <span className="font-mono font-semibold">
                          {compliance.requiredForm}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Regulatory Deadline:</span>
                        <span className="font-mono font-semibold">
                          {deadlineDisplay}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filing Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {compliance?.requiredForm
                  ? `Generate ${compliance.requiredForm} Draft`
                  : "Generate 13F Filing Draft"}
              </CardTitle>
              <CardDescription>
                Automated filing generation with AI-powered validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence mode="wait">
                {filingProgress.step === "idle" && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Button
                      onClick={generateFiling}
                      className="w-full"
                      size="lg"
                      disabled={hasDataQualityWarning}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Filing Draft
                      {hasDataQualityWarning && (
                        <span className="ml-2 text-xs opacity-75">
                          (Disabled - Data Quality Warning)
                        </span>
                      )}
                    </Button>
                    {hasDataQualityWarning && (
                      <p className="mt-2 text-xs text-muted-foreground text-center">
                        Auto-filing is disabled due to data quality warning. Please resolve data source discrepancies before proceeding.
                      </p>
                    )}
                  </motion.div>
                )}

                {filingProgress.step !== "idle" && (
                  <motion.div
                    key="progress"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-semibold flex items-center gap-2">
                          {filingProgress.step === "gathering" && (
                            <Clock className="w-4 h-4 animate-spin" />
                          )}
                          {filingProgress.step === "validating" && (
                            <Clock className="w-4 h-4 animate-spin" />
                          )}
                          {filingProgress.step === "ready" && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                          {filingProgress.message}
                        </span>
                      </div>
                      <Progress value={filingProgress.progress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {filingProgress.step === "gathering" &&
                            "Collecting data from custodians..."}
                          {filingProgress.step === "validating" &&
                            "Verifying legal entity information..."}
                          {filingProgress.step === "ready" &&
                            "Filing draft is ready for review"}
                        </span>
                        <span className="font-mono">
                          {Math.round(filingProgress.progress)}%
                        </span>
                      </div>
                    </div>

                    {filingProgress.step === "ready" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-green-500 mb-1">
                              Filing Draft Generated
                            </p>
                            <p className="text-sm text-muted-foreground mb-3">
                              The 13F filing draft has been generated and is ready
                              for compliance review. All required data has been
                              validated and formatted according to regulatory
                              requirements.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                if (!holding || ownershipPercent == null) return;
                                const position = {
                                  id: holding.id,
                                  ticker: holding.ticker,
                                  issuer: holding.issuer,
                                  isin: holding.isin,
                                  jurisdiction: holding.jurisdiction,
                                  currentPosition: ownershipPercent,
                                  threshold: holding.regulatoryRule.threshold,
                                  buyingVelocity: holding.buyingVelocity,
                                  regulatoryRule: holding.regulatoryRule,
                                };
                                void generate13FPdfDraft({
                                  position,
                                  compliance,
                                  calculation: breach,
                                });
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Download PDF Draft
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

