import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

/**
 * API route to send SMS notifications
 * Supports Twilio (recommended) and console logging for development
 * 
 * Environment variables needed (choose one method):
 * 
 * Method 1 - API Key (Recommended, more secure):
 * - SMS_SERVICE_API_KEY_SID (Twilio API Key SID, starts with SK)
 * - SMS_SERVICE_API_KEY_SECRET (Twilio API Key Secret)
 * - SMS_SERVICE_ACCOUNT_SID (Twilio Account SID, starts with AC)
 * 
 * Method 2 - Auth Token (Traditional):
 * - SMS_SERVICE_API_KEY (Twilio Auth Token)
 * - SMS_SERVICE_SID (Twilio Account SID)
 * 
 * Both methods also need:
 * - SMS_FROM_NUMBER (Twilio phone number, e.g., "+1234567890")
 * - SMS_SERVICE (optional, defaults to "twilio" if credentials are set, otherwise "console")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing required fields: to and message" },
        { status: 400 }
      );
    }

    // Validate phone number format (E.164 format)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = to.replace(/[\s\-\(\)]/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use E.164 format (e.g., +1234567890)" },
        { status: 400 }
      );
    }

    // Check if we have credentials (either API Key method or Auth Token method)
    const hasApiKeyMethod = process.env.SMS_SERVICE_API_KEY_SID && 
                            process.env.SMS_SERVICE_API_KEY_SECRET && 
                            process.env.SMS_SERVICE_ACCOUNT_SID;
    const hasAuthTokenMethod = process.env.SMS_SERVICE_API_KEY && process.env.SMS_SERVICE_SID;
    
    const smsService = process.env.SMS_SERVICE || (hasApiKeyMethod || hasAuthTokenMethod ? "twilio" : "console");
    
    if (smsService === "console" || (!hasApiKeyMethod && !hasAuthTokenMethod)) {
      // Development mode: log to console
      console.log("=".repeat(60));
      console.log("📱 SMS NOTIFICATION (Development Mode)");
      console.log("=".repeat(60));
      console.log(`To: ${cleanPhone}`);
      console.log(`Message: ${message}`);
      console.log("=".repeat(60));
      console.log("💡 To send real SMS, set Twilio credentials (API Key method or Auth Token method) and SMS_FROM_NUMBER");
      console.log("=".repeat(60));
      
      // Simulate async SMS sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return NextResponse.json({ 
        success: true, 
        message: "SMS logged (development mode - set Twilio credentials to send real SMS)",
        to: cleanPhone
      });
    }

    // Production SMS sending with Twilio
    if (smsService === "twilio") {
      try {
        if (!process.env.SMS_FROM_NUMBER) {
          throw new Error("SMS_FROM_NUMBER environment variable is required for Twilio. Get a phone number from https://console.twilio.com/us1/develop/phone-numbers/manage/incoming");
        }

        let client;
        
        // Use API Key method if available (more secure), otherwise fall back to Auth Token
        if (hasApiKeyMethod) {
          client = twilio(
            process.env.SMS_SERVICE_API_KEY_SID!,
            process.env.SMS_SERVICE_API_KEY_SECRET!,
            { accountSid: process.env.SMS_SERVICE_ACCOUNT_SID! }
          );
          console.log("Using Twilio API Key authentication method");
        } else if (hasAuthTokenMethod) {
          client = twilio(
            process.env.SMS_SERVICE_SID!,
            process.env.SMS_SERVICE_API_KEY!
          );
          console.log("Using Twilio Auth Token authentication method");
        } else {
          throw new Error("Twilio credentials not properly configured");
        }

        const twilioMessage = await client.messages.create({
          body: message,
          from: process.env.SMS_FROM_NUMBER,
          to: cleanPhone,
        });

        console.log(`✅ SMS sent successfully via Twilio to ${cleanPhone} (SID: ${twilioMessage.sid})`);
        
        return NextResponse.json({ 
          success: true, 
          message: "SMS sent successfully",
          to: cleanPhone,
          messageSid: twilioMessage.sid
        });
      } catch (twilioError: any) {
        console.error("Twilio error:", twilioError);
        throw new Error(twilioError.message || "Failed to send SMS via Twilio");
      }
    }

    // Future: Add support for other SMS services (AWS SNS, etc.)
    return NextResponse.json(
      { error: `Unsupported SMS service: ${smsService}. Supported: twilio, console` },
      { status: 400 }
    );
  } catch (error) {
    console.error("SMS sending error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to send SMS",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

