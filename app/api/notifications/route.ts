import { NextRequest, NextResponse } from "next/server";
import { getNotificationService } from "@/lib/notification-service";

export async function GET(request: NextRequest) {
  try {
    const service = getNotificationService();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const recipientId = searchParams.get("recipientId") || undefined;
    const channel = searchParams.get("channel") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const status = searchParams.get("status") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const history = await service.getNotificationHistory(page, pageSize, {
      recipientId,
      channel: channel as any,
      severity: severity as any,
      status: status as any,
      startDate,
      endDate,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("[notifications] Error fetching notification history:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details."
      },
      { status: 500 }
    );
  }
}


