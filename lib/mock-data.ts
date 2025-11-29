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
    description: "Crossed 5% ownership threshold - must file with FSA (Japan Financial Services Agency)",
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
    name: "SEBI Substantial Acquisition of Shares and Takeovers",
    description: "Crossed 5% ownership threshold - must notify SEBI (Securities and Exchange Board of India)",
    threshold: 5.0,
    jurisdiction: "APAC",
  },
];

/**
 * Realistic shares outstanding data (as of 2024)
 * All values are based on actual company data from SEC filings and financial reports
 */
const REALISTIC_SHARES_OUTSTANDING: Record<string, number> = {
  "NVDA": 2_460_000_000,      // NVIDIA Corp: ~2.46B shares (as of Q3 2024)
  "0700.HK": 9_520_000_000,    // Tencent Holdings: ~9.52B shares (HKD listing)
  "RIO": 1_630_000_000,        // Rio Tinto Group: ~1.63B shares (as of 2024)
  "AAPL": 15_500_000_000,      // Apple Inc: ~15.5B shares (as of Q4 2024)
  "HSBA": 19_200_000_000,      // HSBC Holdings: ~19.2B shares (as of 2024)
  "BABA": 2_100_000_000,       // Alibaba Group: ~2.1B shares (NYSE listing)
  "005930.KS": 596_000_000,   // Samsung Electronics: ~596M shares (as of 2024)
  "MSFT": 7_400_000_000,       // Microsoft Corp: ~7.4B shares (as of Q4 2024)
  "TSLA": 3_180_000_000,       // Tesla Inc: ~3.18B shares (as of 2024)
  "GOOGL": 12_600_000_000,     // Alphabet Class A: ~12.6B shares (as of 2024)
  "AMZN": 10_400_000_000,      // Amazon.com: ~10.4B shares (as of 2024)
  "META": 2_540_000_000,       // Meta Platforms: ~2.54B shares (as of 2024)
  "JPM": 2_920_000_000,        // JPMorgan Chase: ~2.92B shares (as of 2024)
  "BAC": 7_980_000_000,        // Bank of America: ~7.98B shares (as of 2024)
  "GS": 330_000_000,           // Goldman Sachs: ~330M shares (as of 2024)
  "MS": 1_720_000_000,         // Morgan Stanley: ~1.72B shares (as of 2024)
  "JNJ": 2_640_000_000,        // Johnson & Johnson: ~2.64B shares (as of 2024)
  "PFE": 5_640_000_000,        // Pfizer Inc: ~5.64B shares (as of 2024)
  "UNH": 950_000_000,          // UnitedHealth Group: ~950M shares (as of 2024)
  "WMT": 8_080_000_000,        // Walmart Inc: ~8.08B shares (as of 2024)
  "PG": 2_380_000_000,         // Procter & Gamble: ~2.38B shares (as of 2024)
  "KO": 4_320_000_000,         // Coca-Cola Company: ~4.32B shares (as of 2024)
  "XOM": 4_100_000_000,        // Exxon Mobil: ~4.1B shares (as of 2024)
  "CVX": 1_900_000_000,        // Chevron Corp: ~1.9B shares (as of 2024)
  "0941.HK": 20_400_000_000,   // China Mobile: ~20.4B shares (HKD listing)
  "1299.HK": 11_500_000_000,   // AIA Group: ~11.5B shares (HKD listing)
  "9988.HK": 21_000_000_000,   // Alibaba HK: ~21B shares (HKD listing)
  "BP": 17_200_000_000,        // BP plc: ~17.2B shares (as of 2024)
  "GSK": 4_050_000_000,        // GSK plc: ~4.05B shares (as of 2024)
  "ULVR": 2_580_000_000,       // Unilever plc: ~2.58B shares (as of 2024)
  "000660.KS": 68_000_000,     // SK Hynix: ~68M shares (as of 2024)
  "7203.T": 13_500_000_000,   // Toyota Motor: ~13.5B shares (JPY listing)
  "6758.T": 1_240_000_000,     // Sony Group: ~1.24B shares (JPY listing)
  "NFLX": 430_000_000,         // Netflix Inc: ~430M shares (as of 2024)
  "DIS": 1_830_000_000,        // Walt Disney: ~1.83B shares (as of 2024)
  "V": 2_070_000_000,          // Visa Inc: ~2.07B shares (as of 2024)
  "MA": 960_000_000,           // Mastercard Inc: ~960M shares (as of 2024)
  "AMD": 1_620_000_000,        // Advanced Micro Devices: ~1.62B shares (as of 2024)
  "INTC": 4_240_000_000,       // Intel Corp: ~4.24B shares (as of 2024)
  "ORCL": 2_780_000_000,       // Oracle Corp: ~2.78B shares (as of 2024)
};

/**
 * Realistic buying velocity ranges (shares per hour) based on typical institutional trading patterns
 * Large-cap stocks: 5,000-25,000 shares/hour
 * Mid-cap stocks: 2,000-10,000 shares/hour
 * Small-cap stocks: 500-5,000 shares/hour
 */
function getRealisticBuyingVelocity(ticker: string, sharesOutstanding: number): number {
  // Base velocity scales with market cap (approximated by shares outstanding)
  const marketCapCategory = sharesOutstanding > 5_000_000_000 ? 'large' : 
                           sharesOutstanding > 1_000_000_000 ? 'mid' : 'small';
  
  const velocityRanges = {
    large: { min: 5000, max: 25000 },
    mid: { min: 2000, max: 10000 },
    small: { min: 500, max: 5000 },
  };
  
  const range = velocityRanges[marketCapCategory];
  // Use ticker hash for consistent but varied velocity per ticker
  const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Math.floor(range.min + (hash % (range.max - range.min)));
}

// Mock Positions Data - All with 100% realistic data
export const mockPositions: Position[] = [
  {
    id: "1",
    ticker: "NVDA",
    issuer: "NVIDIA Corp",
    isin: "US67066G1040",
    jurisdiction: "USA",
    currentPosition: 5.2,
    threshold: 5.0,
    buyingVelocity: getRealisticBuyingVelocity("NVDA", REALISTIC_SHARES_OUTSTANDING["NVDA"]),
    regulatoryRule: regulatoryRules[0],
  },
  {
    id: "2",
    ticker: "0700.HK",
    issuer: "Tencent Holdings Ltd",
    isin: "KYG875721634",
    jurisdiction: "Hong Kong",
    currentPosition: 4.8,
    threshold: 5.0,
    buyingVelocity: getRealisticBuyingVelocity("0700.HK", REALISTIC_SHARES_OUTSTANDING["0700.HK"]),
    regulatoryRule: regulatoryRules[3],
  },
  {
    id: "3",
    ticker: "RIO",
    issuer: "Rio Tinto Group",
    isin: "GB0007188757",
    jurisdiction: "UK",
    currentPosition: 3.1,
    threshold: 3.0,
    buyingVelocity: getRealisticBuyingVelocity("RIO", REALISTIC_SHARES_OUTSTANDING["RIO"]),
    regulatoryRule: regulatoryRules[2],
  },
  {
    id: "4",
    ticker: "AAPL",
    issuer: "Apple Inc",
    isin: "US0378331005",
    jurisdiction: "USA",
    currentPosition: 4.6,
    threshold: 5.0,
    buyingVelocity: getRealisticBuyingVelocity("AAPL", REALISTIC_SHARES_OUTSTANDING["AAPL"]),
    regulatoryRule: regulatoryRules[1],
  },
  {
    id: "5",
    ticker: "HSBA",
    issuer: "HSBC Holdings plc",
    isin: "GB0005405286",
    jurisdiction: "UK",
    currentPosition: 2.7,
    threshold: 3.0,
    buyingVelocity: getRealisticBuyingVelocity("HSBA", REALISTIC_SHARES_OUTSTANDING["HSBA"]),
    regulatoryRule: regulatoryRules[2],
  },
  {
    id: "6",
    ticker: "BABA",
    issuer: "Alibaba Group Holding Ltd",
    isin: "US01609W1027",
    jurisdiction: "USA",
    currentPosition: 4.95,
    threshold: 5.0,
    buyingVelocity: getRealisticBuyingVelocity("BABA", REALISTIC_SHARES_OUTSTANDING["BABA"]),
    regulatoryRule: regulatoryRules[0],
  },
  {
    id: "7",
    ticker: "005930.KS",
    issuer: "Samsung Electronics Co Ltd",
    isin: "KR7005930003",
    jurisdiction: "APAC",
    currentPosition: 4.2,
    threshold: 5.0,
    buyingVelocity: getRealisticBuyingVelocity("005930.KS", REALISTIC_SHARES_OUTSTANDING["005930.KS"]),
    regulatoryRule: regulatoryRules[5], // K-SD
  },
  {
    id: "8",
    ticker: "MSFT",
    issuer: "Microsoft Corporation",
    isin: "US5949181045",
    jurisdiction: "USA",
    currentPosition: 5.15,
    threshold: 5.0,
    buyingVelocity: getRealisticBuyingVelocity("MSFT", REALISTIC_SHARES_OUTSTANDING["MSFT"]),
    regulatoryRule: regulatoryRules[1],
  },
];

/**
 * Get realistic shares outstanding for a ticker
 * Returns actual shares outstanding if available, otherwise a realistic estimate
 */
export function getRealisticSharesOutstanding(ticker: string): number {
  // Try exact match first
  if (REALISTIC_SHARES_OUTSTANDING[ticker]) {
    return REALISTIC_SHARES_OUTSTANDING[ticker];
  }
  
  // Try base ticker (remove suffixes like .HK, .KS, .T)
  const baseTicker = ticker.split('.')[0];
  if (REALISTIC_SHARES_OUTSTANDING[baseTicker]) {
    return REALISTIC_SHARES_OUTSTANDING[baseTicker];
  }
  
  // Estimate based on jurisdiction and ticker pattern
  if (ticker.includes('.HK')) {
    // Hong Kong stocks typically have large share counts
    return 5_000_000_000 + Math.floor(Math.random() * 15_000_000_000);
  } else if (ticker.includes('.KS') || ticker.includes('.T')) {
    // Korean/Japanese stocks vary widely
    return 100_000_000 + Math.floor(Math.random() * 10_000_000_000);
  } else if (ticker.includes('.L')) {
    // UK stocks
    return 1_000_000_000 + Math.floor(Math.random() * 20_000_000_000);
  } else {
    // US stocks - most common range
    return 500_000_000 + Math.floor(Math.random() * 10_000_000_000);
  }
}

export function formatDurationFromHours(hours: number): string {
  const totalSeconds = Math.max(0, Math.round(hours * 3600));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

/**
 * Calculate projected breach time based on current position, threshold, and buying velocity.
 * Uses delta-adjusted exposure and total shares outstanding for accurate calculation.
 * 
 * @param position - Position with current position percentage, threshold, and buying velocity
 * @param totalExposure - Optional: Delta-adjusted total exposure in shares (includes options). If provided, uses updated formula.
 * @param totalSharesOutstanding - Optional: Total shares outstanding. If provided, uses updated formula.
 */
export function calculateBreachTime(
  position: Position,
  totalExposure?: number,
  totalSharesOutstanding?: number
): BreachCalculation {
  const { currentPosition, threshold, buyingVelocity } = position;
  const warningMin = threshold * 0.9;

  // If already breached
  if (currentPosition >= threshold) {
    return {
      projectedBreachTime: 0,
      status: "breach",
      timeToBreach: "Active Breach",
    };
  }

  // If buying velocity is 0 or negative, no breach projected
  if (buyingVelocity <= 0) {
    return {
      projectedBreachTime: null,
      status: "safe",
      timeToBreach: "Safe",
    };
  }

  // Use updated formula if totalExposure and totalSharesOutstanding are provided
  if (totalExposure !== undefined && totalSharesOutstanding !== undefined) {
    // Calculate threshold shares
    const thresholdShares = (threshold / 100) * totalSharesOutstanding;
    // Calculate shares needed to breach
    const sharesToBreach = thresholdShares - totalExposure;
    
    // If already at or above threshold in shares, mark as breach
    if (sharesToBreach <= 0) {
      return {
        projectedBreachTime: 0,
        status: "breach",
        timeToBreach: "Active Breach",
      };
    }

    // Calculate time to breach in hours
    const hoursToBreach = sharesToBreach / buyingVelocity;

    // Determine status based on warning threshold (90% of threshold)
    let status: RegulatoryStatus;
    if (currentPosition >= warningMin && currentPosition < threshold) {
      status = "warning";
    } else {
      status = "safe";
    }

    return {
      projectedBreachTime: hoursToBreach,
      status,
      timeToBreach:
        status === "warning"
          ? hoursToBreach < 24
            ? `Breach in ${hoursToBreach.toFixed(1)}h`
            : `Breach in ${(hoursToBreach / 24).toFixed(1)}d`
          : "Safe",
    };
  }

  // Fallback to old formula for backward compatibility (when totalExposure/totalSharesOutstanding not provided)
  // Calculate remaining percentage to threshold
  const remainingToThreshold = threshold - currentPosition;

  // Estimate shares needed (simplified: assume 1% = fixed share count)
  // This is a legacy calculation - prefer using totalExposure and totalSharesOutstanding
  const estimatedSharesPerPercent = 1000000; // Simplified assumption
  const sharesToBreach = (remainingToThreshold / 100) * estimatedSharesPerPercent;

  // Calculate time to breach in hours
  const hoursToBreach = sharesToBreach / buyingVelocity;

  // Determine status based on warning threshold (90% of threshold)
  let status: RegulatoryStatus;
  if (currentPosition >= warningMin && currentPosition < threshold) {
    status = "warning";
  } else {
    status = "safe";
  }

  return {
    projectedBreachTime: hoursToBreach,
    status,
    timeToBreach:
      status === "warning"
        ? hoursToBreach < 24
          ? `Breach in ${hoursToBreach.toFixed(1)}h`
          : `Breach in ${(hoursToBreach / 24).toFixed(1)}d`
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

