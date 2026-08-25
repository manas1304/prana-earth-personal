import { NextRequest, NextResponse } from "next/server";
import {
  getSavedProjects,
  saveProject,
  unsaveProject,
} from "@/actions/project.actions";

export async function GET() {
  try {
    const response = await getSavedProjects();
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = body?.projectId;

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: "projectId is required" },
        { status: 400 },
      );
    }

    const response = await saveProject(projectId);
    const statusCode = response.success ? 201 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = body?.projectId;

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: "projectId is required" },
        { status: 400 },
      );
    }

    const response = await unsaveProject(projectId);
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
