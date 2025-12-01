/**
 * Circuit Breaker pattern implementation for resilient API calls
 * 
 * Prevents cascading failures by opening the circuit after repeated failures
 * and allowing it to recover after a timeout period.
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: CircuitState;
  successCount: number; // For half-open state
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Time in ms before attempting half-open
  halfOpenSuccessThreshold?: number; // Successes needed to close from half-open
}

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      halfOpenSuccessThreshold: 2,
      ...config,
    };
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: "CLOSED",
      successCount: 0,
    };
  }

  /**
   * Check if request should be allowed
   */
  canExecute(): boolean {
    const now = Date.now();

    // If circuit is CLOSED, allow request
    if (this.state.state === "CLOSED") {
      return true;
    }

    // If circuit is OPEN, check if we should try half-open
    if (this.state.state === "OPEN") {
      if (now - this.state.lastFailureTime > this.config.resetTimeout) {
        this.state.state = "HALF_OPEN";
        this.state.successCount = 0;
        return true; // Allow one request to test
      }
      return false; // Circuit is open, reject request
    }

    // If circuit is HALF_OPEN, allow request
    if (this.state.state === "HALF_OPEN") {
      return true;
    }

    return false;
  }

  /**
   * Record a successful execution
   */
  recordSuccess(): void {
    if (this.state.state === "HALF_OPEN") {
      this.state.successCount++;
      if (
        this.state.successCount >=
        (this.config.halfOpenSuccessThreshold || 2)
      ) {
        // Close the circuit after successful half-open attempts
        this.state.state = "CLOSED";
        this.state.failures = 0;
        this.state.successCount = 0;
      }
    } else {
      // Reset failure count on success
      this.state.failures = 0;
      if (this.state.state !== "CLOSED") {
        this.state.state = "CLOSED";
      }
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.state === "HALF_OPEN") {
      // If we fail during half-open, immediately open the circuit
      this.state.state = "OPEN";
      this.state.successCount = 0;
    } else if (
      this.state.failures >= this.config.failureThreshold &&
      this.state.state === "CLOSED"
    ) {
      // Open the circuit if threshold is reached
      this.state.state = "OPEN";
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.state.failures;
  }

  /**
   * Reset circuit breaker (for testing or manual recovery)
   */
  reset(): void {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: "CLOSED",
      successCount: 0,
    };
  }
}

