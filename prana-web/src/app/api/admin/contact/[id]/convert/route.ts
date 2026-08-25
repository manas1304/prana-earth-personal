import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";

const Schema = z.object({
  targetType: z.enum(["express-interest", "dpr"]).default("express-interest"),
  projectId: z.string().uuid().optional(),
  message: z.string().max(2000).optional(),
});

/**
 * POST /api/admin/contact/[id]/convert
 *
 * Converts a `ContactSubmission` into either an `ExpressInterest` (default)
 * or a `DPRRequest`, both anchored on an optional project.
 *
 * The original contact is marked as `RESOLVED` so it disappears from
 * the active list. The new record inherits the contact's name/email/phone.
 *
 * Auth: admin only.
 *
 * Body: `{ targetType?: "express-interest" | "dpr", projectId?, message? }`
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payload",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const contact = await prisma.contactSubmission.findUnique({ where: { id } });
    if (!contact) {
      return NextResponse.json(
        { success: false, message: "Contact submission not found" },
        { status: 404 }
      );
    }

    let projectId = parsed.data.projectId;
    if (!projectId) {
      // Best-effort: find a project whose title matches the contact
      // subject. Falls back to the most recent published project if
      // nothing matches. The metadata.path query was dropped because
      // Postgres JSONB `equals` on a missing path never matches, so
      // it was effectively dead code.
      const guess = await prisma.project.findFirst({
        where: {
          deletedAt: null,
          title: contact.subject
            ? { contains: contact.subject, mode: "insensitive" }
            : undefined,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (guess) {
        projectId = guess.id;
      } else {
        const fallback = await prisma.project.findFirst({
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        if (fallback) projectId = fallback.id;
      }
    }
    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cannot convert: no projectId provided and no project found to anchor the new lead.",
        },
        { status: 400 }
      );
    }

    let newId: string;
    let newType: "express-interest" | "dpr";
    if (parsed.data.targetType === "dpr") {
      const dpr = await prisma.dPRRequest.create({
        data: {
          userId: contact.userId ?? user.id,
          projectId,
          message: parsed.data.message ?? contact.message,
          status: "PENDING",
        },
      });
      newId = dpr.id;
      newType = "dpr";
    } else {
      const ei = await prisma.expressInterest.create({
        data: {
          userId: contact.userId ?? user.id,
          projectId,
          message: parsed.data.message ?? contact.message,
          status: "NEW",
        },
      });
      newId = ei.id;
      newType = "express-interest";
    }

    await prisma.contactSubmission.update({
      where: { id },
      data: { status: "RESOLVED" },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          newId,
          type: newType,
          sourceContactId: id,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to convert contact to lead");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
