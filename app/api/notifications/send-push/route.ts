/**
 * Push Notification API Route
 * 
 * Supports both FCM (Firebase Cloud Messaging) for Android/web and APNS (Apple Push Notification Service) for iOS.
 * 
 * Environment Variables:
 * - PUSH_SERVICE: "fcm" or "apns" (defaults to "console" for development)
 * - FCM_SERVER_KEY: Firebase Cloud Messaging server key (for FCM)
 * - APNS_KEY_ID: Apple Push Notification Service Key ID (for APNS)
 * - APNS_TEAM_ID: Apple Push Notification Service Team ID (for APNS)
 * - APNS_KEY_PATH: Path to APNS .p8 key file (for APNS)
 * - APNS_BUNDLE_ID: iOS app bundle ID (for APNS)
 */

import { NextRequest, NextResponse } from "next/server";

interface PushNotificationRequest {
  token: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  platform?: "ios" | "android" | "web";
}

export async function POST(request: NextRequest) {
  try {
    const body: PushNotificationRequest = await request.json();
    const { token, title, message, data, platform } = body;

    if (!token || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: token, title, and message" },
        { status: 400 }
      );
    }

    const pushService = process.env.PUSH_SERVICE || "console";

    // Development mode: log to console
    if (pushService === "console" || !process.env.FCM_SERVER_KEY) {
      console.log("=".repeat(60));
      console.log("📱 PUSH NOTIFICATION (Development Mode)");
      console.log("=".repeat(60));
      console.log(`Token: ${token.substring(0, 20)}...`);
      console.log(`Platform: ${platform || "unknown"}`);
      console.log(`Title: ${title}`);
      console.log(`Message: ${message}`);
      if (data) {
        console.log(`Data:`, JSON.stringify(data, null, 2));
      }
      console.log("=".repeat(60));
      console.log("💡 To send real push notifications:");
      console.log("   - For FCM: Set FCM_SERVER_KEY environment variable");
      console.log("   - For APNS: Set APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_PATH, and APNS_BUNDLE_ID");
      console.log("=".repeat(60));

      // Simulate async push sending
      await new Promise((resolve) => setTimeout(resolve, 100));

      return NextResponse.json({
        success: true,
        message: "Push notification logged (development mode - set credentials to send real notifications)",
        token: token.substring(0, 20) + "...",
      });
    }

    // Determine platform if not provided
    const detectedPlatform = platform || detectPlatform(token);

    // Send via FCM (Firebase Cloud Messaging)
    if (pushService === "fcm" || detectedPlatform === "android" || detectedPlatform === "web") {
      return await sendViaFCM(token, title, message, data);
    }

    // Send via APNS (Apple Push Notification Service)
    if (pushService === "apns" || detectedPlatform === "ios") {
      return await sendViaAPNS(token, title, message, data);
    }

    return NextResponse.json(
      { error: `Unsupported push service: ${pushService}. Supported: fcm, apns, console` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send push notification",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Detect platform from token format
 */
function detectPlatform(token: string): "ios" | "android" | "web" {
  // FCM tokens are typically longer and contain different characters
  // APNS tokens are typically 64 characters hexadecimal
  if (token.length === 64 && /^[a-fA-F0-9]+$/.test(token)) {
    return "ios";
  }
  // FCM tokens are usually longer and can contain various characters
  if (token.length > 100) {
    return "android";
  }
  return "web";
}

/**
 * Send push notification via FCM (Firebase Cloud Messaging)
 */
async function sendViaFCM(
  token: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<NextResponse> {
  const fcmServerKey = process.env.FCM_SERVER_KEY;
  if (!fcmServerKey) {
    return NextResponse.json(
      { error: "FCM_SERVER_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const fcmUrl = "https://fcm.googleapis.com/fcm/send";
    const payload = {
      to: token,
      notification: {
        title,
        body: message,
      },
      data: data || {},
      priority: "high",
    };

    const response = await fetch(fcmUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${fcmServerKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        `FCM API error: ${response.status} - ${JSON.stringify(responseData)}`
      );
    }

    if (responseData.failure === 1) {
      throw new Error(
        `FCM delivery failed: ${responseData.results?.[0]?.error || "Unknown error"}`
      );
    }

    console.log(`✅ FCM push notification sent successfully to ${token.substring(0, 20)}...`);
    return NextResponse.json({
      success: true,
      message: "Push notification sent via FCM",
      messageId: responseData.message_id,
    });
  } catch (error) {
    console.error("FCM error:", error);
    throw error;
  }
}

/**
 * Send push notification via APNS (Apple Push Notification Service)
 */
async function sendViaAPNS(
  token: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<NextResponse> {
  // APNS requires additional setup with .p8 key file
  // For now, we'll provide a structure that can be extended
  // In production, you would use a library like 'apn' or '@parse/node-apn'

  const apnsKeyId = process.env.APNS_KEY_ID;
  const apnsTeamId = process.env.APNS_TEAM_ID;
  const apnsKeyPath = process.env.APNS_KEY_PATH;
  const apnsBundleId = process.env.APNS_BUNDLE_ID;

  if (!apnsKeyId || !apnsTeamId || !apnsKeyPath || !apnsBundleId) {
    return NextResponse.json(
      {
        error: "APNS configuration incomplete. Required: APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_PATH, APNS_BUNDLE_ID",
        hint: "For APNS, you need to install '@parse/node-apn' package and configure the key file path",
      },
      { status: 500 }
    );
  }

  // Note: Full APNS implementation would require installing '@parse/node-apn'
  // This is a placeholder that shows the structure
  // To fully implement, install: npm install @parse/node-apn
  // Then uncomment and configure the APNS code below

  try {
    // Dynamic import to avoid requiring the package if not installed
    // Note: @parse/node-apn is an optional dependency
    // Install with: npm install @parse/node-apn
    // The build warning is expected and can be ignored if you're not using APNS
    let apn: any;
    try {
      // Use dynamic require for optional dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      apn = require("@parse/node-apn");
    } catch (requireError) {
      return NextResponse.json(
        {
          error: "APNS package not installed. Install with: npm install @parse/node-apn",
          hint: "After installing, configure APNS_KEY_PATH to point to your .p8 key file",
        },
        { status: 500 }
      );
    }

    const provider = new apn.Provider({
      token: {
        key: apnsKeyPath,
        keyId: apnsKeyId,
        teamId: apnsTeamId,
      },
      production: process.env.NODE_ENV === "production",
    });

    const notification = new apn.Notification();
    notification.alert = {
      title,
      body: message,
    };
    notification.topic = apnsBundleId;
    notification.payload = data || {};
    notification.sound = "default";
    notification.badge = 1;
    notification.priority = 10;

    const result = await provider.send(notification, token);
    provider.shutdown();

    if (result.failed && result.failed.length > 0) {
      throw new Error(
        `APNS delivery failed: ${result.failed[0].response?.reason || "Unknown error"}`
      );
    }

    console.log(`✅ APNS push notification sent successfully to ${token.substring(0, 20)}...`);
    return NextResponse.json({
      success: true,
      message: "Push notification sent via APNS",
      sent: result.sent.length,
      failed: result.failed.length,
    });
  } catch (error) {
    console.error("APNS error:", error);
    throw error;
  }
}

