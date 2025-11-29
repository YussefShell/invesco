import {
  Position,
  RegulatoryRule,
  BreachCalculation,
  RegulatoryStatus,
  JurisdictionStatus,
  Jurisdiction,
} from "@/types";

// Regulatory Rules by Jurisdiction
export const regulatoryRules: RegulatoryRule[] = [
  {
    code: "Rule 13D",
    name: "Beneficial Ownership Reporting",
    description: "Crossed 5% ownership threshold - must file Schedule 13D",
    threshold: 5.0,
    jurisdiction: "USA",
  },
  {
    code: "Rule 13G",
    name: "Passive Investment Reporting",
    description: "Crossed 5% ownership threshold - must file Schedule 13G",
    threshold: 5.0,
    jurisdiction: "USA",
  },
  {
    code: "TR-1",
    name: "Major Shareholding Notification",
    description: "Crossed 3% ownership threshold - must notify FCA",
    threshold: 3.0,
    jurisdiction: "UK",
  },
  {
    code: "SFO",
    name: "Securities and Futures Ordinance",
    description: "Crossed 5% ownership threshold - must notify SFC",
    threshold: 5.0,
    jurisdiction: "Hong Kong",
  },
  {
    code: "FIEL",
    name: "Foreign Investment and Exchange Law",
    description: "Crossed 5% ownership threshold - must file with FSA",
    threshold: 5.0,
    jurisdiction: "APAC",
  },
  {
    code: "K-SD",
    name: "Korea Securities Disclosure",
    description: "Crossed 5% ownership threshold - must notify FSS",
    threshold: 5.0,
    jurisdiction: "APAC",
  },
  {
    code: "SFA",
    name: "Securities and Futures Act",
    description: "Crossed 5% ownership threshold - must notify MAS",
    threshold: 5.0,
    jurisdiction: "APAC",
  },
  {
    code: "Corporations Act",
    name: "Substantial Shareholder Notice",
    description: "Crossed 5% ownership threshold - must notify ASIC",
    threshold: 5.0,
    jurisdiction: "APAC",
  },
  {
    code: "CSRC Disclosure",
    name: "China Securities Regulatory Commission Disclosure",
    description: "Crossed 5% ownership threshold - must file with CSRC",
    threshold: 5.0,
    jurisdiction: "APAC",
  },
  {
    code: "SEBI SAST",
    name: "SEBI Substantial Acquisition of Shares",
    description: "Crossed 5% ownership threshold - must notify SEBI",
    threshold: 5.0,
    jurisdiction: "APAC",
  },
];

// Mock Positions Data
export const mockPositions: Position[] = [
  {
    id: "1",
    issuer: "NVIDIA Corp",
    isin: "US67066G1040",
    jurisdiction: "USA",
    currentPosition: 5.2,
    threshold: 5.0,
    buyingVelocity: 12500,
    regulatoryRule: regulatoryRules[0],
  },
  {
    id: "2",
    issuer: "Tencent Holdings Ltd",
    isin: "KYG875721634",
    jurisdiction: "Hong Kong",
    currentPosition: 4.8,
    threshold: 5.0,
    buyingVelocity: 8500,
    regulatoryRule: regulatoryRules[3],
  },
  {
    id: "3",
    issuer: "Rio Tinto Group",
    isin: "GB0007188757",
    jurisdiction: "UK",
    currentPosition: 3.1,
    threshold: 3.0,
    buyingVelocity: 3200,
    regulatoryRule: regulatoryRules[2],
  },
  {
    id: "4",
    issuer: "Apple Inc",
    isin: "US0378331005",
    jurisdiction: "USA",
    currentPosition: 4.6,
    threshold: 5.0,
    buyingVelocity: 15200,
    regulatoryRule: regulatoryRules[1],
  },
  {
    id: "5",
    issuer: "HSBC Holdings plc",
    isin: "GB0005405286",
    jurisdiction: "UK",
    currentPosition: 2.7,
    threshold: 3.0,
    buyingVelocity: 1800,
    regulatoryRule: regulatoryRules[2],
  },
  {
    id: "6",
    issuer: "Alibaba Group Holding Ltd",
    isin: "US01609W1027",
    jurisdiction: "USA",
    currentPosition: 4.95,
    threshold: 5.0,
    buyingVelocity: 9800,
    regulatoryRule: regulatoryRules[0],
  },
  {
    id: "7",
    issuer: "Samsung Electronics Co Ltd",
    isin: "KR7005930003",
    jurisdiction: "APAC",
    currentPosition: 4.2,
    threshold: 5.0,
    buyingVelocity: 4200,
    regulatoryRule: regulatoryRules[5], // K-SD
  },
  {
    id: "8",
    issuer: "Microsoft Corporation",
    isin: "US5949181045",
    jurisdiction: "USA",
    currentPosition: 5.15,
    threshold: 5.0,
    buyingVelocity: 11200,
    regulatoryRule: regulatoryRules[1],
  },
];

export function formatDurationFromHours(hours: number): string {
  const totalSeconds = Math.max(0, Math.round(hours * 3600));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

/**
 * Calculate projected breach time based on current position, threshold, and buying velocity
 */
export function calculateBreachTime(position: Position): BreachCalculation {
  const { currentPosition, threshold, buyingVelocity } = position;

  // If already breached
  if (currentPosition >= threshold) {
    return {
      projectedBreachTime: 0,
      status: "breach",
      timeToBreach: "Active Breach",
    };
  }

  // Calculate remaining percentage to threshold
  const remainingToThreshold = threshold - currentPosition;

  // If buying velocity is 0 or negative, no breach projected
  if (buyingVelocity <= 0) {
    return {
      projectedBreachTime: null,
      status: "safe",
      timeToBreach: "Safe",
    };
  }

  // Estimate shares needed (simplified: assume 1% = fixed share count)
  // In reality, this would be based on market cap and outstanding shares
  const estimatedSharesPerPercent = 1000000; // Simplified assumption
  const sharesToBreach = (remainingToThreshold / 100) * estimatedSharesPerPercent;

  // Calculate time to breach in hours
  const hoursToBreach = sharesToBreach / buyingVelocity;

  // Determine status
  let status: RegulatoryStatus;
  if (remainingToThreshold <= 0.5) {
    status = "warning"; // Within 0.5% of threshold
  } else if (hoursToBreach <= 24) {
    status = "warning"; // Breach within 24 hours
  } else {
    status = "safe";
  }

  return {
    projectedBreachTime: hoursToBreach,
    status,
    timeToBreach:
      hoursToBreach < 1000
        ? `Breach in ${formatDurationFromHours(hoursToBreach)}`
        : "Safe",
  };
}

/**
 * Get regulatory status for a position
 */
export function getRegulatoryStatus(position: Position): RegulatoryStatus {
  const { currentPosition, threshold } = position;
  const remainingToThreshold = threshold - currentPosition;

  if (currentPosition >= threshold) {
    return "breach";
  } else if (remainingToThreshold <= 0.5) {
    return "warning";
  } else {
    return "safe";
  }
}

/**
 * Get jurisdiction rules for a specific jurisdiction
 */
export function getJurisdictionRules(
  jurisdiction: Jurisdiction
): RegulatoryRule[] {
  return regulatoryRules.filter((rule) => rule.jurisdiction === jurisdiction);
}

/**
 * Get status summary for all jurisdictions
 */
export function getJurisdictionStatuses(): JurisdictionStatus[] {
  const jurisdictions: Jurisdiction[] = ["USA", "UK", "Hong Kong", "APAC"];
  const statuses: JurisdictionStatus[] = [];

  jurisdictions.forEach((jurisdiction) => {
    const positions = mockPositions.filter(
      (p) => p.jurisdiction === jurisdiction
    );
    const activeBreaches = positions.filter(
      (p) => getRegulatoryStatus(p) === "breach"
    ).length;
    const warnings = positions.filter(
      (p) => getRegulatoryStatus(p) === "warning"
    ).length;
    const safe = positions.filter(
      (p) => getRegulatoryStatus(p) === "safe"
    ).length;

    // Determine overall status for jurisdiction
    let status: RegulatoryStatus = "safe";
    if (activeBreaches > 0) {
      status = "breach";
    } else if (warnings > 0) {
      status = "warning";
    }

    statuses.push({
      jurisdiction,
      status,
      activeBreaches,
      warnings,
      safe,
    });
  });

  return statuses;
}

/**
 * Get position by ID
 */
export function getPositionById(id: string): Position | undefined {
  return mockPositions.find((p) => p.id === id);
}

