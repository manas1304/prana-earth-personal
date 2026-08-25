import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { exportImplementationPartnersCsv } from "@/actions/implementation-partners.actions";

/**
 * GET /api/admin/implementation-partners/export
 *
 * Streams a CSV of all partners matching the same filters as the list
 * endpoint. Admin-only.
 *
 * Query: `?search=&status=&type=&region=`
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filters: any = {};
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const region = searchParams.get("region");
    if (search) filters.search = search;
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (region) filters.region = region;

    const response = await exportImplementationPartnersCsv(filters);
    if (!response.success) {
      return NextResponse.json(response, { status: 400 });
    }
    const csv = (response as any).data.csv as string;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="implementation-partners-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
