import { prisma } from "@/core/database/prisma";

export interface GetTransactionsFilters {
  search?: string;
  category?: "MARKETPLACE" | "PREDICT" | "BUNDLE" | "FREE" | null;
  status?: string | null;
  dateRange?: string; // '7days' | '30days' | '3months' | '12months' | 'all'
  page?: number;
  limit?: number;
}

export const adminBillingService = {
  /**
   * Fetches transaction history for the admin panel with filtering, searching, and pagination.
   */
  async getTransactions(filters: GetTransactionsFilters = {}) {
    const {
      search,
      category,
      status,
      dateRange = "all",
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    // 1. Status Filter
    if (status) {
      where.status = { equals: status, mode: "insensitive" };
    }

    // 2. Category Filter (SubscriptionPlan.type)
    if (category) {
      where.subscription = {
        plan: {
          type: category,
        },
      };
    }

    // 3. Date Range Filter
    if (dateRange && dateRange !== "all") {
      const startDate = new Date();
      if (dateRange === "7days") {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === "30days") {
        startDate.setDate(startDate.getDate() - 30);
      } else if (dateRange === "3months") {
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (dateRange === "12months") {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      where.createdAt = {
        gte: startDate,
      };
    }

    // 4. Search Filter (providerPaymentId, user name, user email, plan name)
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { providerPaymentId: { contains: term, mode: "insensitive" } },
        { id: { contains: term, mode: "insensitive" } },
        {
          user: {
            OR: [
              { fullName: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
            ],
          },
        },
        {
          subscription: {
            plan: {
              name: { contains: term, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // 5. Query DB
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
          subscription: {
            select: {
              plan: {
                select: {
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    // 6. Shape the output to fit frontend expectations
    const transactions = payments.map((p) => ({
      id: p.id,
      transactionId: p.providerPaymentId || p.id,
      customer: p.user
        ? {
            name: p.user.fullName,
            email: p.user.email,
          }
        : null,
      category: p.subscription?.plan?.type || null,
      itemName: p.subscription?.plan?.name || "Unknown Plan",
      amount: p.amount ? Number(p.amount) : 0,
      currency: p.currency || "USD",
      dateTime: p.createdAt,
      status: p.status || "PENDING",
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  },

  /**
   * Generates a CSV formatted string of matched transaction records.
   */
  async exportTransactionsCSV(filters: Omit<GetTransactionsFilters, "page" | "limit"> = {}) {
    const { search, category, status, dateRange = "all" } = filters;

    const where: any = {};

    if (status) {
      where.status = { equals: status, mode: "insensitive" };
    }

    if (category) {
      where.subscription = {
        plan: {
          type: category,
        },
      };
    }

    if (dateRange && dateRange !== "all") {
      const startDate = new Date();
      if (dateRange === "7days") {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === "30days") {
        startDate.setDate(startDate.getDate() - 30);
      } else if (dateRange === "3months") {
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (dateRange === "12months") {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      where.createdAt = {
        gte: startDate,
      };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { providerPaymentId: { contains: term, mode: "insensitive" } },
        { id: { contains: term, mode: "insensitive" } },
        {
          user: {
            OR: [
              { fullName: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
            ],
          },
        },
        {
          subscription: {
            plan: {
              name: { contains: term, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        subscription: {
          select: {
            plan: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    // Headers matching the CSV request structure
    const headers = [
      "Transaction ID",
      "Customer Name",
      "Customer Email",
      "Category",
      "Item",
      "Amount",
      "Currency",
      "Date & Time",
      "Status",
    ];

    const cleanField = (val: string) => {
      if (!val) return '""';
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = payments.map((p) => {
      const transactionId = p.providerPaymentId || p.id;
      const customerName = p.user?.fullName || "N/A";
      const customerEmail = p.user?.email || "N/A";
      const categoryVal = p.subscription?.plan?.type || "N/A";
      const itemVal = p.subscription?.plan?.name || "Unknown Plan";
      const amountVal = p.amount ? Number(p.amount) : 0;
      const currencyVal = p.currency || "USD";
      const dateVal = p.createdAt.toISOString();
      const statusVal = p.status || "PENDING";

      return [
        cleanField(transactionId),
        cleanField(customerName),
        cleanField(customerEmail),
        cleanField(categoryVal),
        cleanField(itemVal),
        amountVal,
        cleanField(currencyVal),
        cleanField(dateVal),
        cleanField(statusVal),
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  },
};
