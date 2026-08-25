import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";

const NotificationPrefItem = z.object({
  key: z.string().min(1),
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  sms: z.boolean().optional(),
});

const UpdateNotificationPrefsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  items: z.array(NotificationPrefItem).optional(),
});

/**
 * GET /api/users/me/notification-prefs
 *
 * Returns the current user's notification preferences, creating a
 * default row on first call.
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
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          inAppEnabled: true,
        },
      });
    }
    return NextResponse.json(
      {
        success: true,
        data: {
          emailEnabled: prefs.emailEnabled,
          inAppEnabled: prefs.inAppEnabled,
          items: prefs.items ?? [],
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch notification prefs");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/me/notification-prefs
 *
 * Body: `{ emailEnabled?: boolean, inAppEnabled?: boolean, items?: [{ key, email?, inApp?, sms? }] }`
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const body = await req.json();
    const parsed = UpdateNotificationPrefsSchema.safeParse(body);
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
    if (parsed.data.emailEnabled !== undefined)
      data.emailEnabled = parsed.data.emailEnabled;
    if (parsed.data.inAppEnabled !== undefined)
      data.inAppEnabled = parsed.data.inAppEnabled;
    if (parsed.data.items !== undefined) data.items = parsed.data.items;

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        emailEnabled: data.emailEnabled ?? true,
        inAppEnabled: data.inAppEnabled ?? true,
        items: data.items ?? [],
      },
      update: data,
    });
    return NextResponse.json(
      {
        success: true,
        data: {
          emailEnabled: prefs.emailEnabled,
          inAppEnabled: prefs.inAppEnabled,
          items: prefs.items ?? [],
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to update notification prefs");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
