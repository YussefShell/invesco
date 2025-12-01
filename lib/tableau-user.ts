/**
 * Simple username management for Tableau Connected Apps
 * 
 * No authentication system required - uses environment variables and localStorage.
 * This allows the Tableau JWT feature to work without requiring a full auth system.
 * 
 * Priority order for username:
 * 1. localStorage (user-entered in UI)
 * 2. Environment variable (NEXT_PUBLIC_TABLEAU_DEFAULT_USERNAME)
 * 3. Default to 'guest'
 * 
 * Future: When you add authentication, simply update getTableauUsername() to
 * check your auth system first before falling back to these methods.
 */

const STORAGE_KEY = 'tableau-username';

/**
 * Get the Tableau username from multiple sources with safe fallbacks
 * 
 * @returns The username to use for Tableau JWT token generation
 */
export function getTableauUsername(): string {
  // Priority order:
  // 1. localStorage (user-entered)
  // 2. Environment variable
  // 3. Default to 'guest'
  
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) {
      return stored.trim();
    }
  }

  return process.env.NEXT_PUBLIC_TABLEAU_DEFAULT_USERNAME || 'guest';
}

/**
 * Set the Tableau username in localStorage
 * 
 * @param username The username to store
 */
export function setTableauUsername(username: string): void {
  if (typeof window !== 'undefined') {
    const trimmedUsername = username.trim() || process.env.NEXT_PUBLIC_TABLEAU_DEFAULT_USERNAME || 'guest';
    localStorage.setItem(STORAGE_KEY, trimmedUsername);
  }
}

/**
 * Clear the stored Tableau username (resets to environment variable or 'guest')
 */
export function clearTableauUsername(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

