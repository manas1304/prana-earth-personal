import { NextRequest, NextResponse } from "next/server";
import { getProjects, createProject } from "@/actions/project.actions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filters: any = {};

    const status = searchParams.get("status");
    const visibility = searchParams.get("visibility");
    const approvalStatus = searchParams.get("approvalStatus");
    const search = searchParams.get("search");
    const projectType = searchParams.get("projectType");
    const sector = searchParams.get("sector");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    if (status) filters.status = status;
    if (visibility) filters.visibility = visibility;
    if (approvalStatus) filters.approvalStatus = approvalStatus;
    if (search) filters.search = search;
    if (projectType) filters.projectType = projectType;
    if (sector) filters.sector = sector;
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    const response = await getProjects(filters);
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await createProject(body);
    const statusCode = response.success ? 201 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
