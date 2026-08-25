import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/billing/invoices
 *
 * Lists the current user's paid invoices (one per Payment row that
 * succeeded). Used by the Settings → Billing tab.
 *
 * Query: `?page=&limit=&from=&to=`
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10) || 20);
    const skip = (page - 1) * limit;

    const where: any = {
      userId: user.id,
      status: "SUCCESS",
    };
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) {
      where.paidAt = {};
      if (from) where.paidAt.gte = new Date(from);
      if (to) where.paidAt.lte = new Date(to);
    }

    const [rows, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { paidAt: "desc" },
        skip,
        take: limit,
        include: {
          subscription: {
            include: { plan: { select: { name: true, type: true } } },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    const invoices = rows.map((p) => ({
      id: p.id,
      date: p.paidAt ?? p.createdAt,
      description: p.subscription?.plan?.name ?? "Subscription",
      plan: p.subscription?.plan?.type,
      amount: p.amount ? Number(p.amount) : 0,
      currency: p.currency ?? "INR",
      status: p.status,
      invoiceUrl: p.providerPaymentId
        ? `/api/billing/invoices/${p.id}/download`
        : null,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          invoices,
          total,
          page,
          pageSize: limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch invoices");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
