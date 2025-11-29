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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

