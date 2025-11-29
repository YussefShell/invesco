"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePortfolio } from "@/components/PortfolioContext";
import { getNotificationService } from "@/lib/notification-service";
import { calculateBreachTime } from "@/lib/mock-data";
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
    const ownershipPercent =
      (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
    const threshold = holding.regulatoryRule.threshold;
    const warningMin = threshold * 0.9;

    // Determine current status
    let breachStatus: "breach" | "warning" | "safe" = "safe";
    let timeToBreachHours: number | null = null;

    if (ownershipPercent >= threshold) {
      breachStatus = "breach";
    } else if (ownershipPercent >= warningMin && ownershipPercent < threshold) {
      breachStatus = "warning";
      // Calculate time to breach
      if (holding.buyingVelocity > 0) {
        const remainingToThreshold = threshold - ownershipPercent;
        const estimatedSharesPerPercent = 1000000; // Simplified
        const sharesToBreach =
          (remainingToThreshold / 100) * estimatedSharesPerPercent;
        timeToBreachHours = sharesToBreach / holding.buyingVelocity;
      }
    }

    // Check if status changed
    const lastStatus = lastCheckedRef.current.get(holding.id);
    const currentStatusKey = `${breachStatus}-${timeToBreachHours}`;

    // Only trigger alerts if status changed or it's a critical breach
    if (
      lastStatus !== currentStatusKey ||
      breachStatus === "breach" ||
      (breachStatus === "warning" && timeToBreachHours !== null && timeToBreachHours < 24)
    ) {
      // Check alert rules and send notifications
      const notifications = notificationService.checkAlerts(
        holding,
        breachStatus,
        timeToBreachHours
      );

      // Send notifications (in production, this would actually send via email/SMS/push)
      for (const notification of notifications) {
        await notificationService.sendNotification(notification);
      }

      lastCheckedRef.current.set(holding.id, currentStatusKey);
    }
  }, [notificationService]);

  useEffect(() => {
    if (holdings.length === 0) return;

    const checkInterval = setInterval(() => {
      holdings.forEach((holding) => {
        checkHoldingForAlerts(holding);
      });
    }, 30000); // Check every 30 seconds

    // Initial check
    holdings.forEach((holding) => {
      checkHoldingForAlerts(holding);
    });

    return () => clearInterval(checkInterval);
  }, [holdings, checkHoldingForAlerts]);

  return null; // This component doesn't render anything
}

