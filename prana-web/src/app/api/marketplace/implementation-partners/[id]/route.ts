import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import {
  getImplementationPartner,
  updateImplementationPartner,
  deleteImplementationPartner,
} from "@/actions/implementation-partners.actions";

/**
 * GET /api/marketplace/implementation-partners/[id]
 *
 * Public read of a single partner (UUID or readable partner ID).
 * Only ACTIVE partners are returned to unauthenticated callers.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const isAdmin = user?.role === "ADMIN";

    const response = await getImplementationPartner(id);
    if (!response.success) {
      return NextResponse.json(response, { status: 404 });
    }
    // Non-admins can only see ACTIVE partners
    const partner = (response as any).data.partner;
    if (!isAdmin && partner && partner.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "Partner not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/marketplace/implementation-partners/[id]
 *
 * Admin: partial update. Body may include any field of CreatePartnerData,
 * notably `taxId` which the partner edit modal captures but the older
 * server action dropped.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const body = await req.json();
    const response = await updateImplementationPartner(id, body);
    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/marketplace/implementation-partners/[id]
 *
 * Admin: soft-delete (sets deletedAt).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const response = await deleteImplementationPartner(id);
    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
