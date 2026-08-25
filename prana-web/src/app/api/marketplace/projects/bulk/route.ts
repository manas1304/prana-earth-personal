import { NextRequest, NextResponse } from "next/server";
import { bulkUploadProjectsAction } from "@/actions/bulk-project.actions";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const publish = searchParams.get("publish") === "true";
    const body = await req.json();

    // Check if the body contains an array directly or inside a projects field
    const projectsList = Array.isArray(body) ? body : body.projects;

    const response = await bulkUploadProjectsAction(projectsList, publish);
    const statusCode = response.success ? 201 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
