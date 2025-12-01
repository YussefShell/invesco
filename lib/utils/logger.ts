/**
 * Structured logging utility for Production Data Adapters
 * 
 * Provides consistent logging format across all adapters and API routes.
 * In production, logs are JSON-formatted for easy parsing by log aggregation services.
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  metadata?: Record<string, any>;
}

export class Logger {
  private service: string;
  private isProduction: boolean;

  constructor(service: string) {
    this.service = service;
    this.isProduction = process.env.NODE_ENV === "production";
  }

  /**
   * Internal log method that formats and outputs logs
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      metadata: this.sanitizeMetadata(metadata),
    };

    if (this.isProduction) {
      // Production: JSON format for log aggregation
      console.log(JSON.stringify(entry));
    } else {
      // Development: Pretty print with colors
      const color = this.getColorForLevel(level);
      const prefix = `[${this.service}]`;
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        `${color}${prefix}\x1b[0m`,
        message,
        metadata ? metadata : ""
      );
    }
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const sanitized = { ...metadata };
    const sensitiveKeys = ["apiKey", "authToken", "token", "password", "secret"];

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        const value = String(sanitized[key]);
        if (value.length > 8) {
          sanitized[key] = value.substring(0, 4) + "***" + value.substring(value.length - 4);
        } else {
          sanitized[key] = "***";
        }
      }
    }

    return sanitized;
  }

  /**
   * Get ANSI color code for log level
   */
  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case "error":
        return "\x1b[31m"; // Red
      case "warn":
        return "\x1b[33m"; // Yellow
      case "info":
        return "\x1b[36m"; // Cyan
      case "debug":
        return "\x1b[90m"; // Gray
      default:
        return "\x1b[0m"; // Reset
    }
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log("info", message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log("warn", message, metadata);
  }

  error(message: string, metadata?: Record<string, any>) {
    this.log("error", message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>) {
    if (process.env.NODE_ENV === "development" || process.env.DEBUG === "true") {
      this.log("debug", message, metadata);
    }
  }
}

