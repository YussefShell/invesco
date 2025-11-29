import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * API route to send email notifications
 * Supports Resend (recommended), SendGrid, and console logging for development
 * 
 * Environment variables needed:
 * - EMAIL_SERVICE_API_KEY (Resend API key: re_...)
 * - EMAIL_FROM_ADDRESS (e.g., "alerts@yourdomain.com" or "onboarding@resend.dev" for testing)
 * - EMAIL_SERVICE (optional, defaults to "resend" if API key is set, otherwise "console")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, body: emailBody, html } = body;

    if (!to || !subject || (!emailBody && !html)) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, and body/html" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    const emailService = process.env.EMAIL_SERVICE || (process.env.EMAIL_SERVICE_API_KEY ? "resend" : "console");
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";
    
    if (emailService === "console" || !process.env.EMAIL_SERVICE_API_KEY) {
      // Development mode: log to console
      console.log("=".repeat(60));
      console.log("📧 EMAIL NOTIFICATION (Development Mode)");
      console.log("=".repeat(60));
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`From: ${fromAddress}`);
      console.log(`Body:\n${emailBody || html}`);
      console.log("=".repeat(60));
      console.log("💡 To send real emails, set EMAIL_SERVICE_API_KEY and EMAIL_FROM_ADDRESS");
      console.log("=".repeat(60));
      
      // Simulate async email sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return NextResponse.json({ 
        success: true, 
        message: "Email logged (development mode - set EMAIL_SERVICE_API_KEY to send real emails)",
        to,
        subject 
      });
    }

    // Production email sending with Resend
    if (emailService === "resend") {
      try {
        const resend = new Resend(process.env.EMAIL_SERVICE_API_KEY);
        
        const { data, error } = await resend.emails.send({
          from: fromAddress,
          to: [to],
          subject: subject,
          text: emailBody || html.replace(/<[^>]*>/g, ""), // Strip HTML if no plain text
          html: html || emailBody,
        });

        if (error) {
          console.error("Resend API error:", error);
          throw new Error(error.message || "Failed to send email via Resend");
        }

        console.log(`✅ Email sent successfully via Resend to ${to} (ID: ${data?.id})`);
        
        return NextResponse.json({ 
          success: true, 
          message: "Email sent successfully",
          to,
          subject,
          emailId: data?.id
        });
      } catch (resendError) {
        console.error("Resend error:", resendError);
        throw resendError;
      }
    }

    // Future: Add support for other email services (SendGrid, AWS SES, etc.)
    return NextResponse.json(
      { error: `Unsupported email service: ${emailService}. Supported: resend, console` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Email sending error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to send email",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

