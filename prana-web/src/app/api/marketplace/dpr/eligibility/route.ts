import { NextRequest, NextResponse } from "next/server";
import { checkDprEligibility } from "@/actions/dpr.actions";

export async function GET(req: NextRequest) {
  try {
    const response = await checkDprEligibility();
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
