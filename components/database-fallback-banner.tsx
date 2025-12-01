"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DatabaseStatus {
  enabled: boolean;
  status: "connected" | "disabled" | "error";
  usingFallback: boolean;
}

export function DatabaseFallbackBanner() {
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check database status
    const checkDatabaseStatus = async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        
        const status: DatabaseStatus = {
          enabled: data.database?.enabled ?? false,
          status: data.database?.status ?? "disabled",
          usingFallback: data.database?.usingFallback ?? (!data.database?.enabled || data.database?.status !== "connected"),
        };
        
        setDbStatus(status);
      } catch (error) {
        // If health check fails, assume fallback mode
        setDbStatus({
          enabled: false,
          status: "error",
          usingFallback: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkDatabaseStatus();
    // Recheck every 30 seconds
    const interval = setInterval(checkDatabaseStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Don't show if loading or if database is connected
  if (isLoading || !dbStatus || !dbStatus.usingFallback) {
    return null;
  }

  return (
    <Alert
      className={`mb-4 border-yellow-500/50 bg-yellow-500/10 ${
        !isVisible ? "hidden" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Database className="h-4 w-4 text-yellow-500 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-yellow-500 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Using Local Storage Fallback
            </AlertTitle>
            <AlertDescription className="text-yellow-500/90 mt-1">
              Database is not available. Data is being stored in browser local storage.
              {dbStatus.status === "error" && (
                <span className="block mt-1 text-xs">
                  This is expected in development/mock mode. For production, configure POSTGRES_URL.
                </span>
              )}
              {dbStatus.status === "disabled" && (
                <span className="block mt-1 text-xs">
                  Database persistence is disabled. Historical data will be lost on page refresh.
                </span>
              )}
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-yellow-500 hover:text-yellow-600"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}

