/**
 * Tableau Embedding API v3 Configuration Utilities
 * 
 * This module provides utilities for configuring Tableau visualizations
 * with secure authentication for Tableau Server and Tableau Cloud.
 */

export interface TableauConfig {
  serverUrl?: string;
  siteId?: string;
  defaultVizUrl?: string;
  useConnectedApp?: boolean;
  connectedAppClientId?: string;
  connectedAppSecretId?: string;
  connectedAppSecretValue?: string;
}

/**
 * Get Tableau configuration from environment variables
 */
export function getTableauConfig(): TableauConfig {
  return {
    serverUrl: process.env.NEXT_PUBLIC_TABLEAU_SERVER_URL,
    siteId: process.env.NEXT_PUBLIC_TABLEAU_SITE_ID,
    defaultVizUrl: process.env.NEXT_PUBLIC_TABLEAU_DEFAULT_URL,
    useConnectedApp: process.env.NEXT_PUBLIC_TABLEAU_USE_CONNECTED_APP === "true",
    connectedAppClientId: process.env.NEXT_PUBLIC_TABLEAU_CONNECTED_APP_CLIENT_ID,
    connectedAppSecretId: process.env.NEXT_PUBLIC_TABLEAU_CONNECTED_APP_SECRET_ID,
    connectedAppSecretValue: process.env.TABLEAU_CONNECTED_APP_SECRET_VALUE, // Server-side only
  };
}

/**
 * Build a Tableau Server/Cloud URL from components
 */
export function buildTableauUrl(
  serverUrl: string,
  siteId: string | undefined,
  workbook: string,
  view: string
): string {
  const baseUrl = serverUrl.replace(/\/$/, ""); // Remove trailing slash
  const sitePath = siteId ? `/site/${siteId}` : "";
  return `${baseUrl}${sitePath}/views/${workbook}/${view}`;
}

/**
 * Validate Tableau configuration
 */
export function validateTableauConfig(config: TableauConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.useConnectedApp) {
    if (!config.connectedAppClientId) {
      errors.push("NEXT_PUBLIC_TABLEAU_CONNECTED_APP_CLIENT_ID is required when using Connected Apps");
    }
    if (!config.connectedAppSecretId) {
      errors.push("NEXT_PUBLIC_TABLEAU_CONNECTED_APP_SECRET_ID is required when using Connected Apps");
    }
    if (!config.connectedAppSecretValue) {
      errors.push("TABLEAU_CONNECTED_APP_SECRET_VALUE is required when using Connected Apps (server-side only)");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate JWT token for Tableau Connected App authentication
 * 
 * Note: This is a placeholder. In production, JWT generation should be done
 * server-side using a library like 'jsonwebtoken' with proper signing.
 * 
 * For production use, create an API route that generates the JWT token
 * server-side and returns it to the client.
 */
export async function generateTableauJWT(
  clientId: string,
  secretId: string,
  secretValue: string,
  username?: string,
  scopes: string[] = ["tableau:views:embed"]
): Promise<string> {
  // This should be implemented server-side
  // For now, return a placeholder
  throw new Error(
    "JWT generation must be implemented server-side. " +
    "Create an API route that uses a JWT library to sign tokens with your Connected App credentials."
  );
}


