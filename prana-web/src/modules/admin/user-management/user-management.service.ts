import { prisma } from "@/core/database/prisma";

// ─── Filter Types ─────────────────────────────────────────────────────────────

export type UserTab = "all" | "predict" | "marketplace" | "bundle";
export type PlanFilter = "FREE" | "PREDICT" | "MARKETPLACE" | "BUNDLE" | null;
export type StatusFilter = "active" | "deactivated" | null;

export interface GetUsersFilters {
  tab?: UserTab;
  search?: string;
  plan?: PlanFilter;
  status?: StatusFilter;
  page?: number;
  limit?: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const userManagementService = {
  /**
   * Returns a paginated list of users with their organization and active
   * subscription plan. Supports tab-based filtering (all / predict /
   * marketplace / paid), free-text search (name, email, org name), plan
   * type filter, and active/deactivated status filter.
   */
  async getUsers(filters: GetUsersFilters = {}) {
    const { tab = "all", search, plan, status, page = 1, limit = 10 } = filters;

    const skip = (page - 1) * limit;

    // ── Base WHERE: only non-admin, non-deleted users ──────────────────────
    const where: any = {
      role: "USER",
      deletedAt: null,
    };

    // ── Status filter ──────────────────────────────────────────────────────
    if (status === "active") {
      where.isActive = true;
    } else if (status === "deactivated") {
      where.isActive = false;
    }

    // ── Search filter (name, email, org name) ──────────────────────────────
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        {
          organizationMemberships: {
            some: {
              organization: {
                name: { contains: term, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    // ── Tab filter — restricts to users with specific subscription types ───
    // We join via subscriptions relation and filter by active plan type
    const tabPlanTypes: Record<string, string[]> = {
      predict: ["PREDICT", "BUNDLE"],
      marketplace: ["MARKETPLACE", "BUNDLE"],
      bundle: ["BUNDLE"], // ← renamed from "paid"
    };

    if (tab !== "all" && tabPlanTypes[tab]) {
      where.subscriptions = {
        some: {
          status: "ACTIVE",
          plan: { type: { in: tabPlanTypes[tab] } },
        },
      };
    }

    // ── Plan filter (explicit plan type from dropdown) ─────────────────────
    if (plan) {
      if (plan === "FREE") {
        // FREE = no active paid subscription at all
        where.subscriptions = {
          none: {
            status: "ACTIVE",
            plan: { type: { in: ["PREDICT", "MARKETPLACE", "BUNDLE"] } },
          },
        };
      } else {
        where.subscriptions = {
          some: {
            status: "ACTIVE",
            plan: { type: plan },
          },
        };
      }
    }

    // ── Query ──────────────────────────────────────────────────────────────
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          lastActiveAt: true,
          createdAt: true,
          organizationMemberships: {
            take: 1,
            select: {
              organization: {
                select: { id: true, name: true },
              },
            },
          },
          subscriptions: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              billingCycle: true,
              expiresAt: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  priceMonthly: true,
                  priceYearly: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // ── Shape response ─────────────────────────────────────────────────────
    const shaped = users.map((u) => {
      const sub = u.subscriptions[0] ?? null;
      const org = u.organizationMemberships[0]?.organization ?? null;

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        avatarUrl: u.avatarUrl,
        phone: u.phone,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        lastActiveAt: u.lastActiveAt,
        createdAt: u.createdAt,
        organization: org,
        activePlan: sub
          ? {
              planId: sub.plan.id,
              planName: sub.plan.name,
              planType: sub.plan.type,
              billingCycle: sub.billingCycle,
              expiresAt: sub.expiresAt,
              status: sub.status,
              priceMonthly: sub.plan.priceMonthly
                ? Number(sub.plan.priceMonthly)
                : 0,
              priceYearly: sub.plan.priceYearly
                ? Number(sub.plan.priceYearly)
                : 0,
            }
          : null, // null = FREE tier (never purchased)
      };
    });

    return {
      users: shaped,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Returns the full profile for a single user:
   * basic info + first org + active subscription + full payment history.
   */
  async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        jobTitle: true,
        countryRegion: true,
        timezone: true,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        organizationMemberships: {
          take: 1,
          select: {
            role: true,
            joinedAt: true,
            organization: {
              select: { id: true, name: true, slug: true, industry: true },
            },
          },
        },
        subscriptions: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            billingCycle: true,
            startsAt: true,
            expiresAt: true,
            billingProvider: true,
            plan: {
              select: {
                id: true,
                name: true,
                type: true,
                priceMonthly: true,
                priceYearly: true,
              },
            },
            payments: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                paymentProvider: true,
                providerPaymentId: true,
                paidAt: true,
                createdAt: true,
              },
            },
          },
        },
        // All payments (including expired/past subs)
        payments: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            paymentProvider: true,
            providerPaymentId: true,
            paidAt: true,
            createdAt: true,
            subscription: {
              select: {
                plan: {
                  select: { name: true, type: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const activeSub = user.subscriptions[0] ?? null;
    const org = user.organizationMemberships[0] ?? null;

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      jobTitle: user.jobTitle,
      countryRegion: user.countryRegion,
      timezone: user.timezone,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organization: org
        ? {
            ...org.organization,
            memberRole: org.role,
            joinedAt: org.joinedAt,
          }
        : null,
      subscription: activeSub
        ? {
            id: activeSub.id,
            planId: activeSub.plan.id,
            planName: activeSub.plan.name,
            planType: activeSub.plan.type,
            billingCycle: activeSub.billingCycle,
            status: activeSub.status,
            startsAt: activeSub.startsAt,
            expiresAt: activeSub.expiresAt,
            billingProvider: activeSub.billingProvider,
            priceMonthly: activeSub.plan.priceMonthly
              ? Number(activeSub.plan.priceMonthly)
              : 0,
            priceYearly: activeSub.plan.priceYearly
              ? Number(activeSub.plan.priceYearly)
              : 0,
          }
        : null,
      payments: user.payments.map((p) => ({
        id: p.id,
        amount: p.amount ? Number(p.amount) : null,
        currency: p.currency,
        status: p.status,
        paymentProvider: p.paymentProvider,
        providerPaymentId: p.providerPaymentId,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        planName: p.subscription?.plan?.name ?? null,
        planType: p.subscription?.plan?.type ?? null,
      })),
    };
  },

  /**
   * Deactivates a user account (isActive = false).
   * Does not delete — user can be reactivated.
   */
  async deactivateUser(userId: string) {
    return prisma.user.update({
      where: { id: userId, deletedAt: null },
      data: { isActive: false },
      select: { id: true, fullName: true, email: true, isActive: true },
    });
  },

  /**
   * Reactivates a previously deactivated user (isActive = true).
   */
  async activateUser(userId: string) {
    return prisma.user.update({
      where: { id: userId, deletedAt: null },
      data: { isActive: true },
      select: { id: true, fullName: true, email: true, isActive: true },
    });
  },

  /**
   * Soft-deletes a user. Sets deletedAt timestamp.
   * All existing relationships are preserved for audit purposes.
   */
  async deleteUser(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
      select: { id: true, fullName: true, email: true, deletedAt: true },
    });
  },
};
