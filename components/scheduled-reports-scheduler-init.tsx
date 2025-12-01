"use client";

/**
 * Scheduled Reports Scheduler Initialization Component
 * 
 * This component starts the scheduled reports scheduler when the app loads.
 * It runs on the client side to use setInterval for periodic checks.
 */

import { useEffect } from "react";

export function ScheduledReportsSchedulerInit() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Dynamically import the scheduler to avoid SSR issues
    import("@/lib/scheduled-reports-scheduler").then(({ startScheduledReportsScheduler }) => {
      startScheduledReportsScheduler();
    });

    // Cleanup on unmount
    return () => {
      import("@/lib/scheduled-reports-scheduler").then(({ stopScheduledReportsScheduler }) => {
        stopScheduledReportsScheduler();
      });
    };
  }, []);

  return null; // This component doesn't render anything
}

