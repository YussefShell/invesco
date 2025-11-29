"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, CheckCircle2, XCircle, AlertTriangle, Send } from "lucide-react";
import { useAuditLog } from "@/components/contexts/AuditLogContext";
import { usePortfolio } from "@/components/contexts/PortfolioContext";
import {
  runPreTradeChecks,
  isOnRestrictedList,
  checkDenominatorConfidence,
  type ComplianceCheckResult,
} from "@/lib/compliance-rules-engine";
import { calculateDeltaAdjustedExposure } from "@/lib/calculation-utils";

interface PreTradeSimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Fallback mock data for tickers not in portfolio
const FALLBACK_PORTFOLIO_DATA: Record<string, { currentShares: number; totalOutstanding: number }> = {
  TSLA: { currentShares: 2500000, totalOutstanding: 3180000000 },
  GOOGL: { currentShares: 1500000, totalOutstanding: 12500000000 },
};

const REGULATORY_THRESHOLD = 5.0;
const WARNING_THRESHOLD = 4.9;
const ESTIMATED_FILING_COST = 15000;

export default function PreTradeSimulator({
  open,
  onOpenChange,
}: PreTradeSimulatorProps) {
  const [ticker, setTicker] = useState("");
  const [buyQuantity, setBuyQuantity] = useState("");
  const [targetPortfolio, setTargetPortfolio] = useState("US Equity");
  const [approvalRequested, setApprovalRequested] = useState(false);
  const [checkResults, setCheckResults] = useState<ComplianceCheckResult[] | null>(null);
  const { appendLog } = useAuditLog();
  const { holdings } = usePortfolio();

  // Calculate resulting ownership percentage using real-time portfolio data
  const calculation = useMemo(() => {
    if (!ticker || !buyQuantity) {
      return null;
    }

    const quantity = parseFloat(buyQuantity.replace(/,/g, ""));
    if (isNaN(quantity) || quantity <= 0) {
      return null;
    }

    const tickerUpper = ticker.toUpperCase();
    
    // Try to find holding in portfolio (uses real-time data)
    const holding = holdings.find((h) => h.ticker.toUpperCase() === tickerUpper);
    
    let portfolioData: { currentExposure: number; totalOutstanding: number; hasDataQualityWarning: boolean };
    
    if (holding) {
      // Use delta-adjusted exposure (includes options)
      const currentExposure = calculateDeltaAdjustedExposure(holding);
      
      // Check denominator confidence
      const denominatorCheck = checkDenominatorConfidence(
        holding.totalShares_Bloomberg,
        holding.totalShares_Refinitiv,
        holding.totalSharesOutstanding
      );
      
      // Use the most reliable denominator
      let denominator = holding.totalSharesOutstanding;
      if (holding.totalShares_Bloomberg && holding.totalShares_Refinitiv && !denominatorCheck.hasWarning) {
        denominator = (holding.totalShares_Bloomberg + holding.totalShares_Refinitiv) / 2;
      } else if (holding.totalShares_Bloomberg) {
        denominator = holding.totalShares_Bloomberg;
      } else if (holding.totalShares_Refinitiv) {
        denominator = holding.totalShares_Refinitiv;
      }
      
      portfolioData = {
        currentExposure,
        totalOutstanding: denominator,
        hasDataQualityWarning: denominatorCheck.hasWarning,
      };
    } else {
      // Fallback to static data for tickers not in portfolio
      portfolioData = {
        currentExposure: FALLBACK_PORTFOLIO_DATA[tickerUpper]?.currentShares ?? 1000000,
        totalOutstanding: FALLBACK_PORTFOLIO_DATA[tickerUpper]?.totalOutstanding ?? 1000000000,
        hasDataQualityWarning: false,
      };
    }

    const currentOwnership = (portfolioData.currentExposure / portfolioData.totalOutstanding) * 100;
    const newTotalExposure = portfolioData.currentExposure + quantity;
    const resultingOwnership = (newTotalExposure / portfolioData.totalOutstanding) * 100;

    const requiresFiling = resultingOwnership >= REGULATORY_THRESHOLD;
    const isSafe = resultingOwnership < WARNING_THRESHOLD;
    const isWarning = resultingOwnership >= WARNING_THRESHOLD && resultingOwnership < REGULATORY_THRESHOLD;

    const base = {
      currentOwnership,
      resultingOwnership,
      requiresFiling,
      isSafe,
      isWarning,
      newTotalShares: newTotalExposure,
      change: resultingOwnership - currentOwnership,
      hasDataQualityWarning: portfolioData.hasDataQualityWarning,
    };

    const context = {
      ticker: tickerUpper,
      issuer: holding?.issuer ?? tickerUpper,
      jurisdiction: holding?.jurisdiction ?? "USA",
      resultingOwnershipPercent: resultingOwnership,
      currentOwnershipPercent: currentOwnership,
      isOnRestrictedList: isOnRestrictedList(tickerUpper),
    };

    const preTradeChecks = runPreTradeChecks(context);
    setCheckResults(preTradeChecks);

    return base;
  }, [ticker, buyQuantity, holdings]); // Include holdings in dependencies for real-time updates

  const handleReset = () => {
    setTicker("");
    setBuyQuantity("");
    setTargetPortfolio("US Equity");
    setApprovalRequested(false);
    setCheckResults(null);
  };

  const handleRequestApproval = () => {
    setApprovalRequested(true);
    // In a real app, this would trigger an API call to the compliance system
    if (calculation && ticker) {
      const timestamp = new Date().toISOString();
      const systemId = "SIM-ENGINE-01";
      const line = `[${timestamp}] [${systemId}] [PRE_TRADE_CHECK]: Pre-trade simulation requested for ${ticker.toUpperCase()} in portfolio "${targetPortfolio}". Resulting ownership: ${calculation.resultingOwnership.toFixed(
        3
      )}%.`;
      appendLog(line);

      if (checkResults && checkResults.length > 0) {
        for (const result of checkResults) {
          const ruleLine = `[${timestamp}] [${systemId}] [PRE_TRADE_RULE]: Rule "${result.rule.id}" (${result.rule.name}) -> ${result.status}. ${result.message}`;
          appendLog(ruleLine);
        }
      }
    }
    setTimeout(() => {
      // Simulate approval workflow
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Calculator className="w-6 h-6" />
            Pre-Trade Regulatory Impact Simulator
          </DialogTitle>
          <DialogDescription>
            Simulate the regulatory impact of a proposed trade before execution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trade Parameters</CardTitle>
              <CardDescription>Enter trade details to calculate regulatory impact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticker">Ticker Symbol</Label>
                  <Input
                    id="ticker"
                    placeholder="e.g., TSLA"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio">Target Portfolio</Label>
                  <select
                    id="portfolio"
                    value={targetPortfolio}
                    onChange={(e) => setTargetPortfolio(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="US Equity">US Equity</option>
                    <option value="Global Equity">Global Equity</option>
                    <option value="Emerging Markets">Emerging Markets</option>
                    <option value="Fixed Income">Fixed Income</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Proposed Buy Quantity (shares)</Label>
                <Input
                  id="quantity"
                  type="text"
                  placeholder="e.g., 500,000"
                  value={buyQuantity}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9,]/g, "");
                    setBuyQuantity(value);
                  }}
                  className="font-mono text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Enter quantity in shares (commas allowed)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Calculation Results */}
          {calculation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Regulatory Impact Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Ownership Progress Bar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Resulting Ownership</span>
                      <span className="font-mono font-semibold text-lg">
                        {calculation.resultingOwnership.toFixed(2)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min((calculation.resultingOwnership / 10) * 100, 100)}
                      className="h-3"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Current: {calculation.currentOwnership.toFixed(2)}%</span>
                      <span>Threshold: {REGULATORY_THRESHOLD}%</span>
                      <span>10%</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-center py-4">
                    {calculation.isSafe ? (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-3"
                      >
                        <Badge
                          variant="success"
                          className="text-base px-6 py-3 gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          SAFE TO TRADE
                        </Badge>
                      </motion.div>
                    ) : calculation.requiresFiling ? (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <Badge
                          variant="danger"
                          className="text-base px-6 py-3 gap-2"
                        >
                          <XCircle className="w-5 h-5" />
                          STOP: REQUIRES 13D FILING
                        </Badge>
                        <div className="mt-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg w-full">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-red-500 mb-1">
                                Regulatory Friction Cost
                              </p>
                              <p className="text-sm text-muted-foreground mb-2">
                                This trade will trigger mandatory regulatory filing requirements.
                              </p>
                              <p className="text-lg font-mono font-semibold">
                                Est. Legal & Filing Cost: ${ESTIMATED_FILING_COST.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-3"
                      >
                        <Badge
                          variant="warning"
                          className="text-base px-6 py-3 gap-2"
                        >
                          <AlertTriangle className="w-5 h-5" />
                          WARNING: APPROACHING THRESHOLD
                        </Badge>
                      </motion.div>
                    )}
                  </div>

                  {/* Detailed Metrics */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Position</p>
                      <p className="font-mono font-semibold">
                        {calculation.currentOwnership.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Change</p>
                      <p className="font-mono font-semibold text-blue-500">
                        +{calculation.change.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">New Total Shares</p>
                      <p className="font-mono font-semibold">
                        {calculation.newTotalShares.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Compliance Approval Request */}
                  {calculation.requiresFiling && !approvalRequested && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-4 border-t border-border"
                    >
                      <Button
                        onClick={handleRequestApproval}
                        className="w-full"
                        size="lg"
                        variant="outline"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Request Compliance Approval
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        This will notify the Compliance team (Marcia&apos;s team) for review
                      </p>
                    </motion.div>
                  )}

                  {approvalRequested && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-blue-500 mb-1">
                            Approval Request Submitted
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Your request has been sent to the Compliance team. You will receive
                            notification once the review is complete.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Detailed Pre-Trade Checks */}
                  {checkResults && checkResults.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Pre-Trade Compliance Checks
                      </p>
                      <div className="space-y-2">
                        {checkResults.map((result) => (
                          <div
                            key={result.rule.id}
                            className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2"
                          >
                            <div className="flex-1">
                              <p className="text-xs font-mono font-semibold">
                                {result.rule.id}
                              </p>
                              <p className="text-sm font-medium">
                                {result.rule.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {result.message}
                              </p>
                            </div>
                            <div className="flex items-center">
                              {result.status === "BREACH" ? (
                                <Badge variant="danger" className="text-[10px] px-2 py-1">
                                  HARD BLOCK
                                </Badge>
                              ) : result.status === "WARNING" ? (
                                <Badge variant="warning" className="text-[10px] px-2 py-1">
                                  ESCALATE
                                </Badge>
                              ) : (
                                <Badge variant="success" className="text-[10px] px-2 py-1">
                                  PASS
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

