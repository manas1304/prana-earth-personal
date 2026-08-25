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
    const filters: Omit<GetTransactionsFilters, "page" | "limit"> = {};

    const search = searchParams.get("search");
    const category = searchParams.get("category") as GetTransactionsFilters["category"];
    const status = searchParams.get("status");
    const dateRange = searchParams.get("dateRange") as GetTransactionsFilters["dateRange"];

    if (search) filters.search = search;
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (dateRange) filters.dateRange = dateRange;

    const csvContent = await adminBillingService.exportTransactionsCSV(filters);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Transactions CSV export failed");
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to export transactions",
      },
      { status: 500 }
    );
  }
}
