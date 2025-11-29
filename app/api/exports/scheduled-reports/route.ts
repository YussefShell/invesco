import { NextRequest, NextResponse } from "next/server";
import { getExportService } from "@/lib/export-service";
import type { ScheduledReport } from "@/types/exports";

export async function GET() {
  try {
    const service = getExportService();
    const reports = service.getScheduledReports();
    return NextResponse.json(reports);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = getExportService();
    const body = await request.json();
    const report = service.createScheduledReport(
      body as Omit<ScheduledReport, "id" | "nextRun" | "runCount" | "errorCount">
    );
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

