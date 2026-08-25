import { NextRequest, NextResponse } from "next/server";
import { exportDprRequests } from "@/actions/dpr.actions";

export async function GET(req: NextRequest) {
  try {
    const response = await exportDprRequests();
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
