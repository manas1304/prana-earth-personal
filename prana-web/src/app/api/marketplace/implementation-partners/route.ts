import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import {
  getPublicImplementationPartners,
  getImplementationPartners,
  createImplementationPartner,
} from "@/actions/implementation-partners.actions";

/**
 * GET /api/marketplace/implementation-partners
 *
 * Public read of ACTIVE partners for the marketplace carousel
 * (no auth, no admin check).
 *
 * If the caller IS an authenticated admin, return the full
 * (admin-paginated) list instead so the same endpoint can power both
 * the public carousel and the admin list page.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (user && user.role === "ADMIN") {
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
      return NextResponse.json(response, {
        status: response.success ? 200 : 400,
      });
    }

    const response = await getPublicImplementationPartners();
    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/implementation-partners
 *
 * Admin: register a new partner. Mirrors the existing
 * `createImplementationPartner` server action.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const body = await req.json();
    const response = await createImplementationPartner(body);
    return NextResponse.json(response, {
      status: response.success ? 201 : 400,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
