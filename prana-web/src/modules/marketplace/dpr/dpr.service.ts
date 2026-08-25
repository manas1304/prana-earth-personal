import { prisma } from "@/core/database/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  DprSubmissionSchema,
  DprReplySchema,
} from "@/core/validation/dpr.schemas";
import { emailService } from "@/modules/shared/auth/email.service";
import { billingService } from "@/modules/shared/billing/billing.service";
import { logger } from "@/core/logger/pino";
import { ForbiddenError, NotFoundError } from "@/core/errors/api-error";
import { resolveProjectId } from "@/core/utils/project";

function calculateComplexity(regions: string[], certifications: string[]): string {
  const score = (regions?.length || 0) + (certifications?.length || 0);
  if (score <= 2) return "Low";
  if (score <= 4) return "Medium";
  return "High";
}

export const dprService = {
  async checkEligibility(userId: string) {
    const sub = await billingService.getUserSubscription(userId);
    return {
      isEligible: sub.hasSubscription && sub.isMarketplaceAccess,
      planType: sub.planType,
    };
  },

  async createDprRequest(input: unknown, userId: string) {
    // 1. Check eligibility
    const eligibility = await this.checkEligibility(userId);
    if (!eligibility.isEligible) {
      throw new ForbiddenError("Only paid users with marketplace access can request a DPR");
    }

    // 1b. Enforce monthly assessment usage limit (DPR + Express Interest combined)
    const usage = await billingService.getMonthlyAssessmentUsage(userId);
    if (usage.limit > 0 && usage.used >= usage.limit) {
      throw new ForbiddenError(
        "Monthly assessment limit reached. Contact admin to increase your limit.",
      );
    }

    const validated = DprSubmissionSchema.parse(input);

    // 2. Update user profile details (fullName, phone)
    await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: validated.fullName,
        phone: validated.phone || null,
      },
    });

    // 3. Link or create Organization (companyName is optional post-relaxation)
    const userOrg = await prisma.organizationMember.findFirst({
      where: { userId },
      include: { organization: true },
    });

    const orgName =
      validated.companyName?.trim() || validated.fullName || "Personal";
    if (userOrg) {
      // Only overwrite the existing org name when the caller provided
      // a real company name; avoid stomping it with the user's full
      // name fallback.
      if (validated.companyName?.trim()) {
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

    // 4. Calculate complexity (use empty arrays when missing post-relax)
    const complexity = calculateComplexity(
      validated.regionsOfInterest ?? [],
      validated.certifications ?? []
    );

    // 5. Build metadata payload
    const metadata = {
      companyName: validated.companyName,
      industry: validated.industry,
      sustainabilityBudget: validated.sustainabilityBudget,
      primaryMotivation: validated.primaryMotivation,
      companySize: validated.companySize || null,
      regionsOfInterest: validated.regionsOfInterest ?? [],
      certifications: validated.certifications ?? [],
      complexity,
    };

    // 6. Resolve projectId (slug → UUID) before the FK insert
    const projectId = await resolveProjectId(validated.projectId);

    // 7. Create the DPRRequest record
    const request = await prisma.dPRRequest.create({
      data: {
        userId,
        projectId,
        message: validated.additionalRequirements || null,
        status: "PENDING",
        metadata: metadata as any,
      },
    });

    logger.info(
      { dprRequestId: request.id, userId },
      "DPR Request submission created successfully",
    );
    return request;
  },

  async listDprRequests(page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      prisma.dPRRequest.findMany({
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
      prisma.dPRRequest.count(),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async getDprRequest(requestId: string) {
    const request = await prisma.dPRRequest.findUnique({
      where: { id: requestId },
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

    if (!request) {
      throw new NotFoundError("DPR request not found");
    }

    return request;
  },

  async updateStatus(requestId: string, status: string) {
    const data: Prisma.DPRRequestUpdateInput = { status };
    if (status === "RESOLVED" || status === "RESPONDED") {
      data.resolvedAt = new Date();
    }
    return prisma.dPRRequest.update({
      where: { id: requestId },
      data,
    });
  },

  async replyToDprRequest(input: unknown) {
    const validated = DprReplySchema.parse(input);
    const request = await prisma.dPRRequest.findUnique({
      where: { id: validated.dprRequestId },
      include: {
        user: true,
        project: true,
      },
    });

    if (!request) {
      throw new Error("DPR request not found");
    }

    await emailService.sendDprRequestReplyEmail(
      request.user.email,
      request.user.fullName,
      request.project.title,
      validated.replyMessage,
    );

    // Update status to RESPONDED
    await prisma.dPRRequest.update({
      where: { id: validated.dprRequestId },
      data: {
        status: "RESPONDED",
        resolvedAt: new Date(),
      },
    });

    return request;
  },

  async exportDprRequests() {
    return prisma.dPRRequest.findMany({
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

  async getCount() {
    return prisma.dPRRequest.count();
  },
};
