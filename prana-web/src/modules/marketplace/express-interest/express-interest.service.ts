import { prisma } from "@/core/database/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  ExpressInterestSubmissionSchema,
  ExpressInterestReplySchema,
} from "@/core/validation/express-interest.schemas";
import { emailService } from "@/modules/shared/auth/email.service";
import { billingService } from "@/modules/shared/billing/billing.service";
import { logger } from "@/core/logger/pino";
import { resolveProjectId } from "@/core/utils/project";

export const expressInterestService = {
  async createInterest(input: unknown, userId: string) {
    const validated = ExpressInterestSubmissionSchema.parse(input);

    // 0. Enforce monthly assessment usage limit (DPR + Express Interest combined)
    const usage = await billingService.getMonthlyAssessmentUsage(userId);
    if (usage.limit > 0 && usage.used >= usage.limit) {
      throw new Error(
        "Monthly assessment limit reached. Contact admin to increase your limit.",
      );
    }

    // 1. Update user profile details (fullName, phone)
    await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: validated.fullName,
        phone: validated.phone || null,
      },
    });

    // 2. Link or create Organization (company is optional post-relaxation)
    const userOrg = await prisma.organizationMember.findFirst({
      where: { userId },
      include: { organization: true },
    });

    const orgName = validated.company?.trim() || validated.fullName || "Personal";
    if (userOrg) {
      // Only update if the caller actually supplied a company name —
      // avoid clobbering an existing org name with the user's full name
      // fallback.
      if (validated.company?.trim()) {
        await prisma.organization.update({
          where: { id: userOrg.organizationId },
          data: { name: orgName },
        });
      }
    } else {
      const newOrg = await prisma.organization.create({
        data: {
          name: orgName,
          createdById: userId,
        },
      });

      await prisma.organizationMember.create({
        data: {
          organizationId: newOrg.id,
          userId,
          role: "ADMIN",
        },
      });
    }

    // 3. Resolve projectId (slug → UUID) before the FK insert
    const projectId = await resolveProjectId(validated.projectId);

    // 4. Create the ExpressInterest record
    const interest = await prisma.expressInterest.create({
      data: {
        userId,
        projectId,
        message: validated.message || null,
        status: "NEW",
      },
    });

    logger.info(
      { interestId: interest.id, userId },
      "Express interest submission created",
    );
    return interest;
  },

  async listInterests(page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      prisma.expressInterest.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            include: {
              organizationMemberships: {
                include: {
                  organization: true,
                },
              },
            },
          },
          project: true,
        },
      }),
      prisma.expressInterest.count(),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async updateStatus(interestId: string, status: any) {
    const data: Prisma.ExpressInterestUpdateInput = { status };
    if (status === "RESOLVED") {
      data.resolvedAt = new Date();
    }
    return prisma.expressInterest.update({
      where: { id: interestId },
      data,
    });
  },

  async replyToInterest(input: unknown) {
    const validated = ExpressInterestReplySchema.parse(input);
    const interest = await prisma.expressInterest.findUnique({
      where: { id: validated.interestId },
      include: {
        user: true,
        project: true,
      },
    });

    if (!interest) {
      throw new Error("Express Interest request not found");
    }

    await emailService.sendExpressInterestReplyEmail(
      interest.user.email,
      interest.user.fullName,
      interest.project.title,
      validated.replyMessage,
    );

    // Update status to CONTACTED
    await prisma.expressInterest.update({
      where: { id: validated.interestId },
      data: { status: "CONTACTED" },
    });

    return interest;
  },

  async exportInterests() {
    return prisma.expressInterest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          include: {
            organizationMemberships: {
              include: {
                organization: true,
              },
            },
          },
        },
        project: true,
      },
    });
  },
};
