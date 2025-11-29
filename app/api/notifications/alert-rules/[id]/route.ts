import { NextRequest, NextResponse } from "next/server";
import { getNotificationService } from "@/lib/notification-service";
import type { AlertRule } from "@/types/notifications";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = getNotificationService();
    const rule = service.getAlertRule(id);
    if (!rule) {
      return NextResponse.json({ error: "Alert rule not found" }, { status: 404 });
    }
    return NextResponse.json(rule);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
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
    const rule = service.updateAlertRule(id, body as Partial<AlertRule>);
    if (!rule) {
      return NextResponse.json({ error: "Alert rule not found" }, { status: 404 });
    }
    return NextResponse.json(rule);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
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
    const deleted = service.deleteAlertRule(id);
    if (!deleted) {
      return NextResponse.json({ error: "Alert rule not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

