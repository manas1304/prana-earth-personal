import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/actions/project.actions";
import { deleteProjectWithMediaAction } from "@/actions/bulk-project.actions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<any> }
) {
  try {
    const { id } = await params;
    const response = await getProject(id);
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<any> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const response = await updateProject(id, body);
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<any> }
) {
  try {
    const { id } = await params;
    const response = await deleteProjectWithMediaAction(id);
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
