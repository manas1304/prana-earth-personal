import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/help/faqs
 *
 * Public list of published FAQs, grouped by category.
 *
 * Response:
 *   { success, data: { faqs: [{ id, question, answer, category }], categories: [{ id, name, slug }] } }
 */
export async function GET(_req: NextRequest) {
  try {
    const [faqs, categories] = await Promise.all([
      prisma.helpFaq.findMany({
        where: { isPublished: true },
        orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.helpCategory.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true },
      }),
    ]);
    return NextResponse.json(
      {
        success: true,
        data: {
          faqs: faqs.map((f) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            category: f.category
              ? { id: f.category.id, name: f.category.name, slug: f.category.slug }
              : null,
          })),
          categories,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch FAQs");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
