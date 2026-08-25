import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { billingService } from "@/modules/shared/billing/billing.service";

/**
 * GET /api/auth/subscription
 *
 * Returns the current user's subscription plan summary. For anonymous
 * callers it returns a free-tier stub so the client can render the
 * navbar without branching on auth state.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          hasSubscription: false,
          planType: "FREE",
          billingCycle: null,
          expiresAt: null,
          isMarketplaceAccess: false,
          isPredictAccess: false,
        },
      });
    }

    const subscriptionInfo = await billingService.getUserSubscription(user.id);
    return NextResponse.json({
      success: true,
      data: subscriptionInfo,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}
