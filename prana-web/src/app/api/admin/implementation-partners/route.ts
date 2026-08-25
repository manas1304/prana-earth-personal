import { NextRequest, NextResponse } from "next/server";
import {
  getImplementationPartners,
  createImplementationPartner,
} from "@/actions/implementation-partners.actions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filters: any = {};

    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const region = searchParams.get("region");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    if (search) filters.search = search;
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (region) filters.region = region;
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    const response = await getImplementationPartners(filters);
    return NextResponse.json(response, { status: response.success ? 200 : 400 });
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
    const response = await createImplementationPartner(body);
    return NextResponse.json(response, { status: response.success ? 201 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
