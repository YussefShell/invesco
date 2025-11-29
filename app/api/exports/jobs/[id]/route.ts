import { NextRequest, NextResponse } from "next/server";
import { getExportService } from "@/lib/export-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = getExportService();
    const job = service.getExportJob(id);
    if (!job) {
      return NextResponse.json({ error: "Export job not found" }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch (error) {
    const { id } = await params;
    console.error(`[exports/jobs/${id}] Error:`, error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details."
      },
      { status: 500 }
    );
  }
}

