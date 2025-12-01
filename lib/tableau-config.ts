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
 * This function calls the server-side API route to generate JWT tokens securely.
 * The actual token generation is handled server-side to protect credentials.
 */
export async function generateTableauJWT(
  clientId: string,
  secretId: string,
  secretValue: string,
  username?: string,
  scopes: string[] = ["tableau:views:embed"]
): Promise<string> {
  try {
    // Call the server-side API route for secure JWT generation
    const response = await fetch("/api/tableau/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username || "guest",
        scopes: scopes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to generate JWT token: ${response.status}`
      );
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    // If fetch fails (e.g., in server-side context), throw descriptive error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      "Failed to generate JWT token. Ensure the API route is accessible and credentials are configured."
    );
  }
}



