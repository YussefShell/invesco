import { NextRequest, NextResponse } from "next/server";
import { getNotificationService } from "@/lib/notification-service";
import type { Notification } from "@/types/notifications";

/**
 * API route to send a notification via email or SMS
 * This endpoint handles the actual delivery of notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification } = body as { notification: Notification };

    if (!notification) {
      return NextResponse.json(
        { error: "Notification object is required" },
        { status: 400 }
      );
    }

    const service = getNotificationService();
    const success = await service.sendNotification(notification);

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: "Notification sent successfully",
        notification 
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send notification" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[notifications/send] Error sending notification:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details."
      },
      { status: 500 }
    );
  }
}

