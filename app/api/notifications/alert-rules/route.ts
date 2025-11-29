import { NextRequest, NextResponse } from "next/server";
import { getNotificationService } from "@/lib/notification-service";
import type { AlertRule } from "@/types/notifications";

export async function GET() {
  try {
    const service = getNotificationService();
    const rules = service.getAlertRules();
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = getNotificationService();
    const body = await request.json();
    const rule = service.createAlertRule(body as Omit<AlertRule, "id">);
    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

