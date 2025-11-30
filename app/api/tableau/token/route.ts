/**
 * Tableau JWT Token Generation API Route
 * 
 * This endpoint generates JWT tokens for Tableau Connected App authentication.
 * 
 * Environment Variables Required:
 * - TABLEAU_CONNECTED_APP_SECRET_VALUE: The secret value for your Tableau Connected App (server-side only)
 * - NEXT_PUBLIC_TABLEAU_CONNECTED_APP_CLIENT_ID: The client ID for your Tableau Connected App
 * - NEXT_PUBLIC_TABLEAU_CONNECTED_APP_SECRET_ID: The secret ID for your Tableau Connected App
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getTableauConfig } from "@/lib/tableau-config";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const config = getTableauConfig();
    
    // Check if Connected App is configured
    if (!config.useConnectedApp) {
      return NextResponse.json(
        {
          error: "Tableau Connected App is not enabled. Set NEXT_PUBLIC_TABLEAU_USE_CONNECTED_APP=true",
        },
        { status: 400 }
      );
    }

    // Validate required configuration
    if (!config.connectedAppClientId) {
      return NextResponse.json(
        {
          error: "NEXT_PUBLIC_TABLEAU_CONNECTED_APP_CLIENT_ID is not configured",
        },
        { status: 500 }
      );
    }

    if (!config.connectedAppSecretId) {
      return NextResponse.json(
        {
          error: "NEXT_PUBLIC_TABLEAU_CONNECTED_APP_SECRET_ID is not configured",
        },
        { status: 500 }
      );
    }

    if (!config.connectedAppSecretValue) {
      return NextResponse.json(
        {
          error: "TABLEAU_CONNECTED_APP_SECRET_VALUE is not configured (server-side only)",
        },
        { status: 500 }
      );
    }

    // Get user info from request body (optional, defaults to 'guest' if not provided)
    let username = "guest";
    try {
      const body = await request.json();
      username = body.username || "guest";
    } catch {
      // If no body or invalid JSON, use default username
    }

    // Create JWT payload according to Tableau Connected App specification
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: config.connectedAppClientId, // Issuer (Client ID)
      sub: username, // Subject (username)
      aud: "tableau", // Audience
      exp: now + 60 * 60, // Expiration (1 hour from now)
      jti: crypto.randomUUID(), // JWT ID (unique identifier)
      scp: ["tableau:views:embed", "tableau:views:filter"], // Scopes
    };

    // Sign token with HS256 algorithm
    // Note: Tableau Connected Apps require 'kid' (Key ID) in the header, which is the Secret ID
    // We'll manually add it after signing, or use keyid option
    const token = jwt.sign(payload, config.connectedAppSecretValue, {
      algorithm: "HS256",
      keyid: config.connectedAppSecretId, // Key ID (Secret ID) - required by Tableau
    });

    return NextResponse.json({
      token,
      expiresIn: 3600, // 1 hour in seconds
      username,
    });
  } catch (error) {
    console.error("Error generating Tableau JWT token:", error);
    return NextResponse.json(
      {
        error: "Failed to generate JWT token",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
