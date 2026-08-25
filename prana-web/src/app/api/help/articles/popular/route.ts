import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/help/articles/popular?limit=5
 *
 * Public list of published, featured (or top-viewed) help articles for
 * the "Popular articles" block on the help & support page.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "5", 10) || 5,
      50
    );
    const articles = await prisma.helpArticle.findMany({
      where: {
        isPublished: true,
      },
      orderBy: [{ isFeatured: "desc" }, { viewCount: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        category: { select: { name: true, slug: true } },
      },
    });
    const rows = articles.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category?.name,
      readTime: a.readTimeMin,
      viewCount: a.viewCount,
    }));
    return NextResponse.json(
      { success: true, data: { articles: rows } },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch popular articles");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
