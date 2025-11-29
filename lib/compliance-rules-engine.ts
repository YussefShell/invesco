import type { Jurisdiction } from "@/types";

export type RiskStatus = "SAFE" | "WARNING" | "BREACH";

export type ComplianceRuleType =
  | "OWNERSHIP_CONCENTRATION"
  | "RESTRICTED_LIST"
  | "OTHER";

export type ComplianceCheckPhase = "PRE_TRADE" | "POST_TRADE";

export interface ComplianceRuleDefinition {
  id: string;
  name: string;
  jurisdiction?: Jurisdiction | string;
  type: ComplianceRuleType;
  description: string;
}

export interface ComplianceCheckContext {
  ticker: string;
  issuer: string;
  jurisdiction: Jurisdiction | string;
  /**
   * Ownership percentage after the proposed trade is executed.
   */
  resultingOwnershipPercent: number;
  /**
   * Ownership percentage before the proposed trade.
   */
  currentOwnershipPercent: number;
  /**
   * Indicates whether the instrument is on a firm-level restricted list.
   */
  isOnRestrictedList?: boolean;
}

export interface ComplianceCheckResult {
  rule: ComplianceRuleDefinition;
  phase: ComplianceCheckPhase;
  status: RiskStatus;
  /**
   * Human readable summary of why this rule passed / warned / breached.
   */
  message: string;
}

export interface ComplianceEvaluationResult {
  status: RiskStatus;
  color: string;
  requiredForm: string;
  /**
   * Human-readable regulatory deadline description (e.g. "5 Business Days").
   */
  deadline: string;
  /**
   * Machine-readable business-day count for deadline computation.
   */
  deadlineDays: number | null;
}

const COLORS = {
  SAFE: "#22c55e", // green-500
  WARNING: "#f97316", // orange-500
  BREACH: "#ef4444", // red-500
} as const;

const HOLIDAYS: Record<string, string[]> = {
  usa: ["2025-11-28"], // Thanksgiving (mock)
  us: ["2025-11-28"],
  "united states": ["2025-11-28"],
  uk: ["2025-12-26"], // Boxing Day (mock)
  "united kingdom": ["2025-12-26"],
  apac: ["2025-01-01", "2025-12-25"], // New Year's Day, Christmas (common APAC holidays)
  japan: ["2025-01-01", "2025-12-23"], // New Year's Day, Emperor's Birthday
  "south korea": ["2025-01-01", "2025-08-15"], // New Year's Day, Liberation Day
  korea: ["2025-01-01", "2025-08-15"],
  singapore: ["2025-01-01", "2025-08-09"], // New Year's Day, National Day
  australia: ["2025-01-01", "2025-01-26"], // New Year's Day, Australia Day
  china: ["2025-01-01", "2025-10-01"], // New Year's Day, National Day
  india: ["2025-01-01", "2025-08-15"], // New Year's Day, Independence Day
};

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const isHolidayForJurisdiction = (
  date: Date,
  jurisdiction: string
): boolean => {
  const key = jurisdiction.toLowerCase();
  const holidays = HOLIDAYS[key];
  if (!holidays || holidays.length === 0) return false;
  const iso = date.toISOString().slice(0, 10);
  return holidays.includes(iso);
};

export interface BusinessDeadlineResult {
  date: Date;
  /**
   * True if one or more holidays were skipped when computing the deadline.
   */
  adjustedForHoliday: boolean;
}

/**
 * Calculate a business deadline by skipping weekends and jurisdiction-specific holidays.
 *
 * @param startDate - The start date of the clock (e.g. breach detection time)
 * @param days - Number of business days until the deadline
 * @param jurisdiction - Jurisdiction code/name used to look up holidays
 */
export function calculateBusinessDeadline(
  startDate: Date,
  days: number,
  jurisdiction: Jurisdiction | string
): BusinessDeadlineResult {
  let current = new Date(startDate);
  let counted = 0;
  let adjustedForHoliday = false;

  while (counted < days) {
    current.setDate(current.getDate() + 1);
    if (isWeekend(current)) continue;

    if (isHolidayForJurisdiction(current, jurisdiction)) {
      adjustedForHoliday = true;
      continue;
    }

    counted += 1;
  }

  // Final safety check: ensure we don't land on a weekend/holiday
  while (
    isWeekend(current) ||
    isHolidayForJurisdiction(current, jurisdiction)
  ) {
    if (isHolidayForJurisdiction(current, jurisdiction)) {
      adjustedForHoliday = true;
    }
    current.setDate(current.getDate() + 1);
  }

  return { date: current, adjustedForHoliday };
}

/**
 * Simple firm-level restricted list for demonstration purposes.
 * In a real system this would be sourced from compliance master data.
 */
const RESTRICTED_LIST = new Set<string>(["BANNED1", "BANNED2", "RISKYCO"]);

export function isOnRestrictedList(ticker: string): boolean {
  return RESTRICTED_LIST.has(ticker.toUpperCase());
}

/**
 * Registry of generic pre/post trade compliance rules used by the simulator.
 */
export const BASE_COMPLIANCE_RULES: ComplianceRuleDefinition[] = [
  {
    id: "OWNERSHIP_10PC_HARD_CAP",
    name: "Global 10% Ownership Hard Cap",
    type: "OWNERSHIP_CONCENTRATION",
    description:
      "Prevents any single strategy from exceeding 10% beneficial ownership in a single issuer.",
  },
  {
    id: "FIRM_RESTRICTED_LIST",
    name: "Firm Restricted List",
    type: "RESTRICTED_LIST",
    description:
      "Blocks trading in issuers that are subject to firm-level restrictions or MNPI controls.",
  },
];

/**
 * Run lightweight pre-trade checks that are independent of specific
 * jurisdictional disclosure regimes (13D / TR-1 etc.). These are
 * complementary to the jurisdiction-specific risk evaluation below.
 */
export function runPreTradeChecks(
  context: ComplianceCheckContext
): ComplianceCheckResult[] {
  const results: ComplianceCheckResult[] = [];

  for (const rule of BASE_COMPLIANCE_RULES) {
    if (rule.id === "OWNERSHIP_10PC_HARD_CAP") {
      const status: RiskStatus =
        context.resultingOwnershipPercent >= 10
          ? "BREACH"
          : context.resultingOwnershipPercent >= 9.5
          ? "WARNING"
          : "SAFE";

      const message =
        status === "BREACH"
          ? `Resulting ownership ${context.resultingOwnershipPercent.toFixed(
              2
            )}% breaches the 10% hard cap.`
          : status === "WARNING"
          ? `Resulting ownership ${context.resultingOwnershipPercent.toFixed(
              2
            )}% is within 50 bps of the 10% hard cap.`
          : `Resulting ownership ${context.resultingOwnershipPercent.toFixed(
              2
            )}% is comfortably below the 10% hard cap.`;

      results.push({
        rule,
        phase: "PRE_TRADE",
        status,
        message,
      });
    } else if (rule.id === "FIRM_RESTRICTED_LIST") {
      const restricted = context.isOnRestrictedList ?? false;
      results.push({
        rule,
        phase: "PRE_TRADE",
        status: restricted ? "BREACH" : "SAFE",
        message: restricted
          ? `Instrument ${context.ticker} is on the firm restricted list.`
          : `Instrument ${context.ticker} is not on the firm restricted list.`,
      });
    }
  }

  return results;
}

/**
 * Evaluate regulatory risk for a holding based on jurisdiction and position type.
 *
 * - USA (SEC):
 *   - Threshold: 5.0%
 *   - Warning: 4.5% - 4.99%
 *   - Filing: Schedule 13D
 *   - Deadline: 5 Business Days
 *
 * - UK (FCA):
 *   - Threshold: 3.0%
 *   - Warning: 2.5% - 2.99%
 *   - Filing: Form TR-1
 *   - Deadline: 2 Trading Days
 *
 * - Hong Kong (SFC):
 *   - Long Threshold: 5.0% (warning 4.5% - 4.99%)
 *   - Short Threshold: 1.0% (warning 0.8% - 0.99%)
 *   - Filing: Form 2 (Corporate Substantial Shareholder)
 *   - Deadline: 3 Business Days
 *
 * - APAC (Multiple Jurisdictions):
 *   - Japan (FSA): Threshold 5.0% - FIEL Filing - 5 Business Days
 *   - South Korea (FSS): Threshold 5.0% - K-SD - 5 Business Days
 *   - Singapore (MAS): Threshold 5.0% - SFA Notification - 2 Business Days
 *   - Australia (ASIC): Threshold 5.0% - Corporations Act Notice - 2 Business Days
 *   - China (CSRC): Threshold 5.0% - CSRC Disclosure - 3 Business Days
 *   - India (SEBI): Threshold 5.0% - SEBI SAST - 2 Business Days
 *   - Warning: 4.5% - 4.99% for all APAC jurisdictions
 */
export function evaluateRisk(
  jurisdiction: string,
  holdingPercent: number,
  positionType: "long" | "short"
): ComplianceEvaluationResult {
  const normalizedJurisdiction = jurisdiction.toLowerCase() as Jurisdiction | string;

  // USA (SEC Mode)
  if (normalizedJurisdiction === "usa" || normalizedJurisdiction === "us") {
    const threshold = 5.0;
    const warningMin = 4.5;
    const warningMax = 4.99;

    if (holdingPercent >= threshold) {
      return {
        status: "BREACH",
        color: COLORS.BREACH,
        requiredForm: "Schedule 13D",
        deadline: "5 Business Days",
        deadlineDays: 5,
      };
    }

    if (holdingPercent >= warningMin && holdingPercent <= warningMax) {
      return {
        status: "WARNING",
        color: COLORS.WARNING,
        requiredForm: "Schedule 13D",
        deadline: "5 Business Days",
        deadlineDays: 5,
      };
    }

    return {
      status: "SAFE",
      color: COLORS.SAFE,
      requiredForm: "Schedule 13D",
      deadline: "5 Business Days",
      deadlineDays: 5,
    };
  }

  // UK (FCA Mode)
  if (
    normalizedJurisdiction === "uk" ||
    normalizedJurisdiction === "united kingdom" ||
    normalizedJurisdiction === "fca"
  ) {
    const threshold = 3.0;
    const warningMin = 2.5;
    const warningMax = 2.99;

    if (holdingPercent >= threshold) {
      return {
        status: "BREACH",
        color: COLORS.BREACH,
        requiredForm: "Form TR-1",
        deadline: "2 Trading Days",
        deadlineDays: 2,
      };
    }

    if (holdingPercent >= warningMin && holdingPercent <= warningMax) {
      return {
        status: "WARNING",
        color: COLORS.WARNING,
        requiredForm: "Form TR-1",
        deadline: "2 Trading Days",
        deadlineDays: 2,
      };
    }

    return {
      status: "SAFE",
      color: COLORS.SAFE,
      requiredForm: "Form TR-1",
      deadline: "2 Trading Days",
      deadlineDays: 2,
    };
  }

  // Hong Kong (SFC Mode)
  if (
    normalizedJurisdiction === "hong kong" ||
    normalizedJurisdiction === "hk" ||
    normalizedJurisdiction === "sfc"
  ) {
    const longThreshold = 5.0;
    const longWarningMin = 4.5;
    const longWarningMax = 4.99;

    const shortThreshold = 1.0;
    const shortWarningMin = 0.8;
    const shortWarningMax = 0.99;

    const isLong = positionType === "long";

    if (
      (isLong && holdingPercent >= longThreshold) ||
      (!isLong && holdingPercent >= shortThreshold)
    ) {
      return {
        status: "BREACH",
        color: COLORS.BREACH,
        requiredForm: "Form 2 (Corporate Substantial Shareholder)",
        deadline: "3 Business Days",
        deadlineDays: 3,
      };
    }

    if (isLong) {
      if (holdingPercent >= longWarningMin && holdingPercent <= longWarningMax) {
        return {
          status: "WARNING",
          color: COLORS.WARNING,
          requiredForm: "Form 2 (Corporate Substantial Shareholder)",
          deadline: "3 Business Days",
          deadlineDays: 3,
        };
      }
    } else {
      if (holdingPercent >= shortWarningMin && holdingPercent <= shortWarningMax) {
        return {
          status: "WARNING",
          color: COLORS.WARNING,
          requiredForm: "Form 2 (Corporate Substantial Shareholder)",
          deadline: "3 Business Days",
          deadlineDays: 3,
        };
      }
    }

    return {
      status: "SAFE",
      color: COLORS.SAFE,
      requiredForm: "Form 2 (Corporate Substantial Shareholder)",
      deadline: "3 Business Days",
      deadlineDays: 3,
    };
  }

  // APAC (Multiple Jurisdictions)
  // Covers: Japan (FSA), South Korea (FSS), Singapore (MAS), Australia (ASIC), China (CSRC), India (SEBI)
  if (
    normalizedJurisdiction === "apac" ||
    normalizedJurisdiction === "asia pacific" ||
    normalizedJurisdiction === "japan" ||
    normalizedJurisdiction === "south korea" ||
    normalizedJurisdiction === "korea" ||
    normalizedJurisdiction === "singapore" ||
    normalizedJurisdiction === "australia" ||
    normalizedJurisdiction === "china" ||
    normalizedJurisdiction === "india"
  ) {
    const threshold = 5.0;
    const warningMin = 4.5;
    const warningMax = 4.99;

    // Determine specific form based on jurisdiction context
    // In practice, this would be determined by the specific country within APAC
    let requiredForm = "APAC Regulatory Disclosure";
    let deadline = "5 Business Days";
    let deadlineDays = 5;

    // Country-specific forms (can be refined based on actual jurisdiction detection)
    if (normalizedJurisdiction === "japan") {
      requiredForm = "FIEL Filing (Foreign Investment and Exchange Law)";
      deadline = "5 Business Days";
      deadlineDays = 5;
    } else if (normalizedJurisdiction === "south korea" || normalizedJurisdiction === "korea") {
      requiredForm = "K-SD (Korea Securities Disclosure)";
      deadline = "5 Business Days";
      deadlineDays = 5;
    } else if (normalizedJurisdiction === "singapore") {
      requiredForm = "SFA Notification (Securities and Futures Act)";
      deadline = "2 Business Days";
      deadlineDays = 2;
    } else if (normalizedJurisdiction === "australia") {
      requiredForm = "Corporations Act Substantial Shareholder Notice";
      deadline = "2 Business Days";
      deadlineDays = 2;
    } else if (normalizedJurisdiction === "china") {
      requiredForm = "CSRC Disclosure (China Securities Regulatory Commission)";
      deadline = "3 Business Days";
      deadlineDays = 3;
    } else if (normalizedJurisdiction === "india") {
      requiredForm = "SEBI SAST (Substantial Acquisition of Shares)";
      deadline = "2 Business Days";
      deadlineDays = 2;
    }

    if (holdingPercent >= threshold) {
      return {
        status: "BREACH",
        color: COLORS.BREACH,
        requiredForm,
        deadline,
        deadlineDays,
      };
    }

    if (holdingPercent >= warningMin && holdingPercent <= warningMax) {
      return {
        status: "WARNING",
        color: COLORS.WARNING,
        requiredForm,
        deadline,
        deadlineDays,
      };
    }

    return {
      status: "SAFE",
      color: COLORS.SAFE,
      requiredForm,
      deadline,
      deadlineDays,
    };
  }

  // Fallback for unsupported jurisdictions – default to SAFE with no specific form/deadline
  return {
    status: "SAFE",
    color: COLORS.SAFE,
    requiredForm: "N/A",
    deadline: "N/A",
    deadlineDays: null,
  };
}

