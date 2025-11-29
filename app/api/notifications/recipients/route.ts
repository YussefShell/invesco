import { NextRequest, NextResponse } from "next/server";
import { getNotificationService } from "@/lib/notification-service";
import type { NotificationRecipient } from "@/types/notifications";

export async function GET() {
  try {
    const service = getNotificationService();
    const recipients = service.getRecipients();
    return NextResponse.json(recipients);
  } catch (error) {
    console.error("[notifications/recipients] Error fetching recipients:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = getNotificationService();
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || (!body.email && !body.phone)) {
      return NextResponse.json(
        { error: "Name and at least one contact method (email or phone) are required" },
        { status: 400 }
      );
    }

    // Determine channels based on provided contact methods
    const channels: ("email" | "sms" | "push")[] = [];
    if (body.email) channels.push("email");
    if (body.phone) channels.push("sms");
    if (body.pushToken) channels.push("push");

    if (channels.length === 0) {
      return NextResponse.json(
        { error: "At least one notification channel (email or phone) is required" },
        { status: 400 }
      );
    }

    const recipient = service.createRecipient({
      name: body.name,
      email: body.email,
      phone: body.phone,
      pushToken: body.pushToken,
      channels,
    });

    return NextResponse.json(recipient, { status: 201 });
  } catch (error) {
    console.error("[notifications/recipients] Error creating recipient:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details."
      },
      { status: 500 }
    );
  }
}

