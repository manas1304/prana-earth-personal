import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { UpdateProfileSchema } from "@/core/validation/auth.schemas";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/users/me
 *
 * Returns the full current-user payload (used by /profile and /settings
 * to pre-fill the edit modal and the page chrome).
 *
 * Response:
 *   {
 *     success: true,
 *     data: {
 *       user: {
 *         id, fullName, email, role,
 *         phone, jobTitle, countryRegion, timezone, locale, avatarUrl,
 *         isEmailVerified, isActive,
 *         organization: { id, name, role, joinedAt } | null
 *       }
 *     }
 *   }
 */
export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        organizationMemberships: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true, logoUrl: true },
            },
          },
          take: 1,
        },
      },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    const membership = user.organizationMemberships[0];
    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            phone: user.phone,
            jobTitle: user.jobTitle,
            countryRegion: user.countryRegion,
            timezone: user.timezone,
            // `locale` is not a column on User; included for client
            // convenience, persisted via notification prefs metadata in a
            // follow-up.
            locale: null,
            avatarUrl: user.avatarUrl,
            isEmailVerified: user.isEmailVerified,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            organization: membership
              ? {
                  id: membership.organization.id,
                  name: membership.organization.name,
                  slug: membership.organization.slug,
                  logoUrl: membership.organization.logoUrl,
                  role: membership.role,
                  joinedAt: membership.joinedAt,
                }
              : null,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch full current user");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/me
 *
 * Body: any subset of:
 *   { fullName, phone, jobTitle, countryRegion, timezone, locale, avatarUrl }
 *
 * Updates the current user's profile. Returns the updated user payload
 * (same shape as GET).
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const body = await req.json();
    const parsed = UpdateProfileSchema.safeParse(body);
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
    const data: any = {};
    if (parsed.data.fullName !== undefined) data.fullName = parsed.data.fullName;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
    if (parsed.data.jobTitle !== undefined) data.jobTitle = parsed.data.jobTitle;
    if (parsed.data.countryRegion !== undefined)
      data.countryRegion = parsed.data.countryRegion;
    if (parsed.data.timezone !== undefined) data.timezone = parsed.data.timezone;
    if (parsed.data.avatarUrl !== undefined) data.avatarUrl = parsed.data.avatarUrl;

    const user = await prisma.user.update({
      where: { id: session.id },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        jobTitle: true,
        countryRegion: true,
        timezone: true,
        avatarUrl: true,
        isEmailVerified: true,
        isActive: true,
      },
    });
    return NextResponse.json(
      { success: true, data: { user } },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to update current user");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
