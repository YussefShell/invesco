/**
 * Performance utilities for CPU optimization
 */

/**
 * Throttle function calls to reduce CPU usage
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * Debounce function calls to reduce CPU usage
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * Check if browser is in low-power mode or throttled
 */
export function isLowPowerMode(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  // Check for hardware concurrency (low-end devices typically have 2-4 cores)
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) return true;
  
  // Check for device memory (if available)
  const memory = (navigator as any).deviceMemory;
  if (memory && memory <= 2) return true;
  
  return false;
}

/**
 * Adaptive performance settings based on device capabilities
 */
export function getAdaptiveSettings() {
  const isLowPower = isLowPowerMode();
  
  return {
    isLowPower,
    updateInterval: isLowPower ? 60000 : 30000, // 60s for low power, 30s for normal
    batchSize: isLowPower ? 25 : 50,
    changeThreshold: isLowPower ? 0.005 : 0.002, // 0.5% vs 0.2%
    maxConcurrentUpdates: isLowPower ? 10 : 20,
    useIdleCallback: true,
  };
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallbackSafe(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if (typeof requestIdleCallback !== 'undefined') {
    return requestIdleCallback(callback, options);
  } else {
    // Fallback to setTimeout with longer delay
    return setTimeout(callback, options?.timeout || 1000) as unknown as number;
  }
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallbackSafe(handle: number): void {
  if (typeof cancelIdleCallback !== 'undefined') {
    cancelIdleCallback(handle);
  } else {
    clearTimeout(handle as unknown as NodeJS.Timeout);
  }
}

/**
 * Process array in chunks to avoid blocking the main thread
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize: number = 50
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = chunk.map(processor);
    results.push(...chunkResults);
    
    // Yield to browser between chunks
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return results;
}

