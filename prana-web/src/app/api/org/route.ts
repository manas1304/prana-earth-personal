import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";

const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  industry: z.string().max(255).optional().nullable(),
  about: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  country: z.string().max(100).optional().nullable(),
  companySize: z.string().max(100).optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
});

/**
 * GET /api/org
 *
 * Returns the current user's primary organization (first membership) or
 * 404 if they have none. Includes the user's role and joined date.
 *
 * Response:
 *   { success, data: { organization: { id, name, slug, logoUrl, industry, about, website, country, companySize, membersCount, role, joinedAt } } }
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, organization: { deletedAt: null } },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "No organization found for user" },
        { status: 404 }
      );
    }
    const membersCount = await prisma.organizationMember.count({
      where: { organizationId: membership.organizationId },
    });
    return NextResponse.json(
      {
        success: true,
        data: {
          organization: {
            id: membership.organization.id,
            name: membership.organization.name,
            slug: membership.organization.slug,
            logoUrl: membership.organization.logoUrl,
            industry: membership.organization.industry,
            about: (membership.organization as any).about ?? null,
            website: membership.organization.website,
            country: membership.organization.country,
            companySize: membership.organization.companySize,
            membersCount,
            role: membership.role,
            joinedAt: membership.joinedAt,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch organization");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/org
 *
 * Body: any subset of `{ name, industry, about, website, country, companySize, logoUrl }`.
 *
 * Auth: caller must be the OWNER or ADMIN of the org.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const body = await req.json();
    const parsed = UpdateOrgSchema.safeParse(body);
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

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, organization: { deletedAt: null } },
    });
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "No organization found" },
        { status: 404 }
      );
    }
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only OWNER or ADMIN members can update organization details.",
        },
        { status: 403 }
      );
    }

    const data: any = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.industry !== undefined)
      data.industry = parsed.data.industry || null;
    if (parsed.data.about !== undefined)
      data.about = parsed.data.about || null;
    if (parsed.data.website !== undefined)
      data.website = parsed.data.website || null;
    if (parsed.data.country !== undefined)
      data.country = parsed.data.country || null;
    if (parsed.data.companySize !== undefined)
      data.companySize = parsed.data.companySize || null;
    if (parsed.data.logoUrl !== undefined)
      data.logoUrl = parsed.data.logoUrl || null;

    const updated = await prisma.organization.update({
      where: { id: membership.organizationId },
      data,
    });
    return NextResponse.json(
      { success: true, data: { organization: updated } },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to update organization");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
