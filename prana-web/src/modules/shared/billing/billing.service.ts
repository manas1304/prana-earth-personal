import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "@/core/database/prisma";
import { BadRequestError, NotFoundError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import {
  CreatePlanSchema,
  UpdatePlanSchema,
} from "@/core/validation/billing.schemas";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});

export const billingService = {
  /**
   * Retrieves subscription plans.
   * If adminOnly is false, returns only active, publicly visible plans.
   */
  async getSubscriptionPlans(adminOnly: boolean = false) {
    const where: any = {};
    if (!adminOnly) {
      where.isActive = true;
      where.isPubliclyVisible = true;
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
        },
      },
    });

    // Convert decimal prices to numbers for easier consumption on frontend
    return plans.map((p) => ({
      ...p,
      priceMonthly: p.priceMonthly ? Number(p.priceMonthly) : 0,
      priceYearly: p.priceYearly ? Number(p.priceYearly) : 0,
      discountPercentage: p.discountPercentage ? Number(p.discountPercentage) : 0,
      activeSubscribers: p.subscriptions.length,
    }));
  },

  /**
   * Creates a new subscription plan (Admin only).
   */
  async createSubscriptionPlan(input: unknown) {
    const validated = CreatePlanSchema.parse(input);

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: validated.name,
        type: validated.type,
        description: validated.description,
        priceMonthly: validated.priceMonthly,
        priceYearly: validated.priceYearly,
        maxAssessments: validated.maxAssessments,
        satelliteScans: validated.satelliteScans,
        documentStorage: validated.documentStorage,
        features: validated.features as any,
        isPubliclyVisible: validated.isPubliclyVisible,
        applyDiscount: validated.applyDiscount,
        discountPercentage: validated.discountPercentage,
        discountDuration: validated.discountDuration,
        isActive: true,
      },
    });

    logger.info({ planId: plan.id }, "Subscription plan created successfully");
    return plan;
  },

  /**
   * Updates an existing subscription plan (Admin only).
   */
  async updateSubscriptionPlan(id: string, input: unknown) {
    const planExists = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });
    if (!planExists) {
      throw new NotFoundError("Subscription plan not found");
    }

    const validated = UpdatePlanSchema.parse(input);

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: validated.name ?? undefined,
        type: validated.type ?? undefined,
        description: validated.description !== undefined ? validated.description : undefined,
        priceMonthly: validated.priceMonthly !== undefined ? validated.priceMonthly : undefined,
        priceYearly: validated.priceYearly !== undefined ? validated.priceYearly : undefined,
        maxAssessments: validated.maxAssessments !== undefined ? validated.maxAssessments : undefined,
        satelliteScans: validated.satelliteScans !== undefined ? validated.satelliteScans : undefined,
        documentStorage: validated.documentStorage !== undefined ? validated.documentStorage : undefined,
        features: validated.features !== undefined ? (validated.features as any) : undefined,
        isPubliclyVisible: validated.isPubliclyVisible !== undefined ? validated.isPubliclyVisible : undefined,
        applyDiscount: validated.applyDiscount !== undefined ? validated.applyDiscount : undefined,
        discountPercentage: validated.discountPercentage !== undefined ? validated.discountPercentage : undefined,
        discountDuration: validated.discountDuration !== undefined ? validated.discountDuration : undefined,
      },
    });

    logger.info({ planId: id }, "Subscription plan updated successfully");
    return updatedPlan;
  },

  /**
   * Initiates payment for a subscription plan by creating a Razorpay order.
   * If user has no prior subscription, applies a discount if configured.
   */
  async initiatePayment(userId: string, planId: string, billingCycle: "MONTHLY" | "YEARLY") {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundError("Subscription plan not found");
    }

    let basePrice = billingCycle === "MONTHLY" ? plan.priceMonthly : plan.priceYearly;
    if (!basePrice) {
      throw new BadRequestError("Plan does not support selected billing cycle");
    }

    let finalPrice = Number(basePrice);

    // Check discount eligibility: ineligible if user has any existing subscription history
    const existingSub = await prisma.subscription.findFirst({
      where: { userId },
    });

    const isDiscountEligible = !existingSub;

    if (isDiscountEligible && plan.applyDiscount && plan.discountPercentage) {
      const discount = Number(plan.discountPercentage);
      finalPrice = finalPrice * (1 - discount / 100);
    }

    // Razorpay amount is in paise (multiply by 100)
    // Convert USD to INR (e.g. 83 INR per USD) to make checkout functional for Razorpay.
    // If USD is preferred directly, we keep it, but INR is default for standard Razorpay integrations.
    const conversionRate = 83;
    const finalAmountInPaise = Math.round(finalPrice * conversionRate * 100);

    const orderOptions = {
      amount: finalAmountInPaise,
      currency: "INR",
      receipt: `receipt_${userId.substring(0, 8)}_${Date.now()}`,
      notes: {
        userId,
        planId,
        billingCycle,
        finalPriceUSD: finalPrice.toString(),
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    logger.info(
      { userId, orderId: order.id, amount: order.amount },
      "Razorpay order initiated successfully"
    );

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      finalPriceUSD: finalPrice,
      isDiscountApplied: isDiscountEligible && plan.applyDiscount,
    };
  },

  /**
   * Verifies Razorpay payment signature and activates the user's subscription.
   */
  async verifyPayment(
    userId: string,
    orderId: string,
    paymentId: string,
    signature: string
  ) {
    // 1. Signature Verification
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "placeholder_secret")
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (generatedSignature !== signature) {
      logger.error({ orderId, paymentId }, "Razorpay signature verification failed");
      throw new BadRequestError("Invalid payment signature");
    }

    // 2. Fetch order notes from Razorpay to retrieve metadata
    let orderDetails;
    try {
      orderDetails = await razorpay.orders.fetch(orderId);
    } catch (err) {
      logger.error({ err, orderId }, "Failed to fetch order details from Razorpay");
      throw new BadRequestError("Failed to fetch Razorpay order details");
    }

    const { planId, billingCycle, finalPriceUSD } = orderDetails.notes as any;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundError("Subscription plan not found");
    }

    // 3. Find or Create User's Organization
    let memberRecord = await prisma.organizationMember.findFirst({
      where: { userId },
    });

    let organizationId: string;

    if (memberRecord) {
      organizationId = memberRecord.organizationId;
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Create a default organization
      const orgName = `${user.fullName}'s Organization`;
      const organization = await prisma.organization.create({
        data: {
          name: orgName,
          createdById: userId,
        },
      });

      // Add user as OWNER role
      await prisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          role: "ADMIN", // Maps to UserRole admin or USER; organization member maps to UserRole enum.
        },
      });

      organizationId = organization.id;
    }

    // Calculate dates
    const startsAt = new Date();
    const expiresAt = new Date();
    if (billingCycle === "MONTHLY") {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // 4. Create or Update Subscription and Record Payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deactivate any currently active subscriptions for this user
      await tx.subscription.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });

      // Create new subscription
      const subscription = await tx.subscription.create({
        data: {
          userId,
          organizationId,
          planId,
          status: "ACTIVE",
          billingCycle: billingCycle as any,
          startsAt,
          expiresAt,
          billingProvider: "RAZORPAY",
          externalSubscriptionId: orderId,
        },
      });

      // Record successful payment
      const payment = await tx.payment.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          amount: parseFloat(finalPriceUSD),
          currency: "USD",
          paymentProvider: "RAZORPAY",
          providerPaymentId: paymentId,
          status: "SUCCESS",
          paidAt: new Date(),
        },
      });

      return { subscription, payment };
    });

    logger.info(
      { userId, subscriptionId: result.subscription.id, paymentId: result.payment.id },
      "Subscription activated and payment recorded successfully"
    );

    return result;
  },

  /**
   * Retrieves the current user's active subscription and features.
   */
  async getUserSubscription(userId: string) {
    const sub = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    if (!sub || !sub.plan) {
      return {
        hasSubscription: false,
        planType: "FREE",
        billingCycle: null,
        expiresAt: null,
        isMarketplaceAccess: false,
        isPredictAccess: false,
        planMaxAssessments: 0,
      };
    }

    const type = sub.plan.type;

    return {
      hasSubscription: true,
      planId: sub.plan.id,
      planName: sub.plan.name,
      planType: type,
      billingCycle: sub.billingCycle,
      expiresAt: sub.expiresAt,
      isMarketplaceAccess: type === "MARKETPLACE" || type === "BUNDLE",
      isPredictAccess: type === "PREDICT" || type === "BUNDLE",
      planMaxAssessments: sub.plan.maxAssessments ?? 0,
    };
  },

  /**
   * Returns the user's monthly assessment usage (combined DPR + Express Interest requests)
   * along with the limit defined by their active subscription plan.
   * `limit === 0` means no cap (e.g. FREE plan or plan without a configured value).
   */
  async getMonthlyAssessmentUsage(userId: string) {
    const sub = await this.getUserSubscription(userId);
    const limit = (sub as any).planMaxAssessments ?? 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [dprCount, eiCount] = await Promise.all([
      prisma.dPRRequest.count({
        where: { userId, createdAt: { gte: startOfMonth } },
      }),
      prisma.expressInterest.count({
        where: { userId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    return { used: dprCount + eiCount, limit };
  },
};
