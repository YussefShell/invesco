import { NextRequest, NextResponse } from "next/server";
import { getNotificationService } from "@/lib/notification-service";
import type { NotificationRecipient } from "@/types/notifications";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = getNotificationService();
    const recipient = service.getRecipient(id);
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }
    return NextResponse.json(recipient);
  } catch (error) {
    const { id } = await params;
    console.error(`[notifications/recipients/${id}] Error:`, error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details."
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = getNotificationService();
    const body = await request.json();

    // Update channels based on provided contact methods
    if (body.email || body.phone || body.pushToken) {
      const recipient = service.getRecipient(id);
      if (recipient) {
        const channels: ("email" | "sms" | "push")[] = [];
        const email = body.email !== undefined ? body.email : recipient.email;
        const phone = body.phone !== undefined ? body.phone : recipient.phone;
        const pushToken = body.pushToken !== undefined ? body.pushToken : recipient.pushToken;

        if (email) channels.push("email");
        if (phone) channels.push("sms");
        if (pushToken) channels.push("push");

        if (channels.length === 0) {
          return NextResponse.json(
            { error: "At least one notification channel (email or phone) is required" },
            { status: 400 }
          );
        }

        body.channels = channels;
      }
    }

    const updated = service.updateRecipient(id, body as Partial<NotificationRecipient>);
    if (!updated) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const { id } = await params;
    console.error(`[notifications/recipients/${id}] Error:`, error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = getNotificationService();
    const deleted = service.deleteRecipient(id);
    if (!deleted) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await params;
    console.error(`[notifications/recipients/${id}] Error:`, error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details."
      },
      { status: 500 }
    );
  }
}

