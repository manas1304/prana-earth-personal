import { NextRequest, NextResponse } from "next/server";
import { getS3UploadUrlAction } from "@/actions/bulk-project.actions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName");
    const contentType = searchParams.get("contentType");

    if (!fileName || !contentType) {
      return NextResponse.json(
        { success: false, message: "Missing fileName or contentType query parameters" },
        { status: 400 }
      );
    }

    const response = await getS3UploadUrlAction(fileName, contentType);
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
