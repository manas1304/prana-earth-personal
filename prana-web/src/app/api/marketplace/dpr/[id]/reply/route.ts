import { NextRequest, NextResponse } from "next/server";
import { replyToDprRequest } from "@/actions/dpr.actions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const response = await replyToDprRequest({
      dprRequestId: id,
      replyMessage: body.replyMessage,
    });
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
