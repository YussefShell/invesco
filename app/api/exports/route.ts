import { NextRequest, NextResponse } from "next/server";
import { getExportService } from "@/lib/export-service";
import type { ExportOptions } from "@/types/exports";
import type { Holding } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const service = getExportService();
    const body = await request.json();
    const options = body.options as ExportOptions;
    const holdings = body.holdings as Holding[];

    if (!holdings || !Array.isArray(holdings)) {
      return NextResponse.json(
        { error: "Holdings data is required" },
        { status: 400 }
      );
    }

    const job = await service.exportData(holdings, options);

    // Return job ID and download URL
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("[exports] Error creating export job:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details."
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const service = getExportService();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const jobs = service.getExportJobs(limit);
    return NextResponse.json(jobs);
  } catch (error) {
    console.error("[exports] Error fetching export jobs:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details."
      },
      { status: 500 }
    );
  }
}

