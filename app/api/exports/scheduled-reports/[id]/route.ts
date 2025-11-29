import { NextRequest, NextResponse } from "next/server";
import { getExportService } from "@/lib/export-service";
import type { ScheduledReport } from "@/types/exports";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = getExportService();
    const report = service.getScheduledReport(id);
    if (!report) {
      return NextResponse.json({ error: "Scheduled report not found" }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch (error) {
    const { id } = await params;
    console.error(`[exports/scheduled-reports/${id}] Error:`, error);
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
    const service = getExportService();
    const body = await request.json();
    const report = service.updateScheduledReport(
      id,
      body as Partial<ScheduledReport>
    );
    if (!report) {
      return NextResponse.json({ error: "Scheduled report not found" }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch (error) {
    const { id } = await params;
    console.error(`[exports/scheduled-reports/${id}] Error:`, error);
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
    const service = getExportService();
    const deleted = service.deleteScheduledReport(id);
    if (!deleted) {
      return NextResponse.json({ error: "Scheduled report not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await params;
    console.error(`[exports/scheduled-reports/${id}] Error:`, error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details."
      },
      { status: 500 }
    );
  }
}

