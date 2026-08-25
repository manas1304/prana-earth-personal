import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { contactService } from "@/modules/shared/contact/contact.service";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/admin/contact-submissions/[id]
 *
 * Returns a single contact submission with all fields (including
 * the `company` and `role` first-class columns and the raw
 * `metadata` JSON).
 *
 * Auth: admin only.
 */
export async function GET(
  _req: NextRequest,
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
    const submission = await contactService.getSubmissionById(id);
    if (!submission) {
      return NextResponse.json(
        { success: false, message: "Contact submission not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: true, data: { submission } },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch contact submission");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
