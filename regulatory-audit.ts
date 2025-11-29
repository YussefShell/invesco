import { evaluateRisk } from "./lib/compliance-rules-engine";

function logScenario(
  label: string,
  jurisdiction: string,
  holdingPercent: number,
  positionType: "long" | "short"
) {
  const result = evaluateRisk(jurisdiction, holdingPercent, positionType);
  // eslint-disable-next-line no-console
  console.log(`\n${label}`);
  // eslint-disable-next-line no-console
  console.log(
    `Input -> Jurisdiction: ${jurisdiction}, Holding: ${holdingPercent}%, Position: ${positionType}`
  );
  // eslint-disable-next-line no-console
  console.log(
    `Output -> status: ${result.status}, color: ${result.color}, requiredForm: ${result.requiredForm}, deadline: ${result.deadline}`
  );
}

// Scenario A: UK vs US Contrast
logScenario("Scenario A1 - UK 3.5% (FCA Mode)", "UK", 3.5, "long");
logScenario("Scenario A2 - USA 3.5% (SEC Mode)", "USA", 3.5, "long");

// Scenario B: Hong Kong Short Position
logScenario("Scenario B - HK 1.2% Short (SFC Mode)", "HK", 1.2, "short");

// Scenario C: USA Warning Zone
logScenario("Scenario C - USA 4.8% (Warning Zone)", "USA", 4.8, "long");

/**
 * Expected Legal Outcomes:
 *
 * Scenario A1 (UK, 3.5%):
 *  - Threshold: 3.0%
 *  - 3.5% >= 3.0% -> BREACH, red, Form TR-1, 2 Trading Days
 *
 * Scenario A2 (USA, 3.5%):
 *  - Threshold: 5.0%
 *  - 3.5% < 4.5% warning zone -> SAFE, green, Schedule 13D, 5 Business Days
 *
 * Scenario B (HK, 1.2% short):
 *  - Short threshold: 1.0%
 *  - 1.2% >= 1.0% -> BREACH, red, Form 2, 3 Business Days
 *
 * Scenario C (USA, 4.8%):
 *  - Warning zone: 4.5% - 4.99%
 *  - 4.8% in warning band -> WARNING, orange, Schedule 13D, 5 Business Days
 */


