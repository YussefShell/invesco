"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePortfolio } from "@/components/contexts/PortfolioContext";
import { getNotificationService } from "@/lib/notification-service";
import { calculateDeltaAdjustedExposure } from "@/lib/calculation-utils";
import type { Holding } from "@/types";

/**
 * Component that monitors holdings for breaches and triggers notifications
 * This runs in the background and checks for alert conditions
 */
export function NotificationMonitor() {
  const { holdings } = usePortfolio();
  const notificationService = getNotificationService();
  const lastCheckedRef = useRef<Map<string, string>>(new Map()); // holdingId -> last status

  const checkHoldingForAlerts = useCallback(async (holding: Holding) => {
    // Use delta-adjusted exposure for institutional-grade accuracy
    const totalExposure = calculateDeltaAdjustedExposure(holding);
    const ownershipPercent =
      (totalExposure / holding.totalSharesOutstanding) * 100;
    const threshold = holding.regulatoryRule.threshold;
    const warningMin = threshold * 0.9;

    // Determine current status
    let breachStatus: "breach" | "warning" | "safe" = "safe";
    let timeToBreachHours: number | null = null;

    if (ownershipPercent >= threshold) {
      breachStatus = "breach";
    } else if (ownershipPercent >= warningMin && ownershipPercent < threshold) {
      breachStatus = "warning";
      // Calculate time to breach using delta-adjusted exposure
      if (holding.buyingVelocity > 0) {
        const thresholdShares = (threshold / 100) * holding.totalSharesOutstanding;
        const sharesToBreach = thresholdShares - totalExposure;
        timeToBreachHours = sharesToBreach / holding.buyingVelocity;
      }
    }

    // Always check alert rules - rules may have been created/updated
    // The checkAlerts method handles cooldowns internally, so we can check every time
    const notifications = notificationService.checkAlerts(
      holding,
      breachStatus,
      timeToBreachHours
    );

    // Send notifications (in production, this would actually send via email/SMS/push)
    for (const notification of notifications) {
      await notificationService.sendNotification(notification);
    }

    // Update last checked status for tracking
    const currentStatusKey = `${breachStatus}-${timeToBreachHours}`;
    lastCheckedRef.current.set(holding.id, currentStatusKey);
  }, [notificationService]);

  // OPTIMIZED: Use ref to track holdings and reduce effect re-runs
  const holdingsRef = useRef(holdings);
  useEffect(() => {
    holdingsRef.current = holdings;
  }, [holdings]);

  // Function to check all holdings immediately
  const checkAllHoldings = useCallback(() => {
    holdingsRef.current.forEach((holding) => {
      checkHoldingForAlerts(holding);
    });
  }, [checkHoldingForAlerts]);

  useEffect(() => {
    if (holdings.length === 0) return;

    // Check every 30 seconds to ensure new rules are evaluated promptly
    const checkInterval = setInterval(() => {
      // Check all holdings - rules may have been created/updated
      checkAllHoldings();
    }, 30000); // Check every 30 seconds to catch new rules quickly

    // Initial check (debounced)
    const initialTimeout = setTimeout(() => {
      checkAllHoldings();
    }, 2000); // Wait 2 seconds after mount

    // Listen for rule updates to trigger immediate check
    const handleRuleUpdate = () => {
      console.log('Alert rule updated - checking all holdings immediately');
      checkAllHoldings();
    };
    window.addEventListener('alert-rule-updated', handleRuleUpdate);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(initialTimeout);
      window.removeEventListener('alert-rule-updated', handleRuleUpdate);
    };
  }, [holdings.length, checkAllHoldings]);

  return null; // This component doesn't render anything
}

// Default export for lazy loading
export default NotificationMonitor;

