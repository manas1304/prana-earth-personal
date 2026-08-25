import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/billing/usage
 *
 * Lightweight alias used by the predict sidebar to show
 * "X of Y free assessments remaining".
 *
 * Counts the user's COMPLETED assessments in the current calendar month
 * vs the limit on their active subscription plan (or 1 for FREE).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          used: 0,
          limit: 0,
          remaining: 0,
          resetAt: null,
        },
      });
    }
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [used, sub] = await Promise.all([
      prisma.assessment.count({
        where: {
          status: "COMPLETED",
          initiatedById: user.id,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.subscription.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const limit = sub?.plan?.maxAssessments ?? 1;
    const resetAt = new Date(startOfMonth);
    resetAt.setMonth(resetAt.getMonth() + 1);

    return NextResponse.json(
      {
        success: true,
        data: {
          used,
          limit,
          remaining: Math.max(0, limit - used),
          resetAt: resetAt.toISOString(),
          planType: sub?.plan?.type ?? "FREE",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch billing usage");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
