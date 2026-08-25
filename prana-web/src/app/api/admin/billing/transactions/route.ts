import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { logger } from "@/core/logger/pino";
import { adminBillingService, GetTransactionsFilters } from "@/modules/admin/billing/billing.service";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filters: GetTransactionsFilters = {};

    const search = searchParams.get("search");
    const category = searchParams.get("category") as GetTransactionsFilters["category"];
    const status = searchParams.get("status");
    const dateRange = searchParams.get("dateRange") as GetTransactionsFilters["dateRange"];
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    if (search) filters.search = search;
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (dateRange) filters.dateRange = dateRange;
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    // Clamp limit to prevent abuse
    const safeLimit = Math.min(filters.limit ?? 10, 100);
    const result = await adminBillingService.getTransactions({
      ...filters,
      limit: safeLimit,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Transactions fetched successfully.",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Transactions fetch failed");
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch transactions",
      },
      { status: 500 }
    );
  }
}
