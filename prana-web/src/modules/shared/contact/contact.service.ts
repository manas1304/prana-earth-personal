import { prisma } from "@/core/database/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  ContactSubmissionSchema,
  ContactReplySchema,
} from "@/core/validation/contact.schemas";
import { emailService } from "@/modules/shared/auth/email.service";
import { logger } from "@/core/logger/pino";

export interface ListContactSubmissionsFilters {
  page?: number;
  pageSize?: number;
  /** Free-text search across fullName, email, company, subject, message */
  q?: string;
  /** Filter by status, e.g. "UNREAD" | "READ" | "REPLIED" */
  status?: string;
  /** Filter by source, e.g. "marketplace-contact" | "predict-contact" */
  source?: string;
  /** ISO date — only show submissions created on or after this */
  from?: string;
  /** ISO date — only show submissions created on or before this */
  to?: string;
}

const SUBMISSION_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  email: true,
  phone: true,
  company: true,
  role: true,
  subject: true,
  message: true,
  status: true,
  source: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const contactService = {
  async createSubmission(input: unknown) {
    const validated = ContactSubmissionSchema.parse(input);

    // Backward compat: if the caller still passes company/role via
    // `metadata`, lift them to the first-class columns so the admin
    // leads page can show them without JSON parsing.
    const meta = (validated.metadata ?? {}) as Record<string, unknown>;
    const company =
      validated.company?.trim() ||
      (typeof meta.company === "string" ? meta.company : null) ||
      null;
    const role =
      validated.role?.trim() ||
      (typeof meta.role === "string" ? meta.role : null) ||
      null;

    const submission = await prisma.contactSubmission.create({
      data: {
        fullName: validated.fullName,
        email: validated.email,
        phone: validated.phone ?? null,
        company,
        role,
        subject: validated.subject ?? null,
        message: validated.message,
        source: validated.source ?? "marketplace",
        metadata:
          validated.metadata === undefined
            ? undefined
            : (validated.metadata ?? Prisma.JsonNull),
      },
    });

    await emailService.sendContactSubmissionEmail(
      validated.email,
      validated.fullName,
      validated.subject ?? "Contact request",
    );

    logger.info({ submissionId: submission.id }, "Contact submission created");
    return submission;
  },

  /**
   * Paginated, filtered list of contact submissions — used by the
   * admin leads page (and the new HTTP API).
   *
   * Supports: q (free-text), status, source, from, to, page, pageSize.
   */
  async listSubmissions(filters: ListContactSubmissionsFilters = {}) {
    const {
      page = 1,
      pageSize = 20,
      q,
      status,
      source,
      from,
      to,
    } = filters;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ContactSubmissionWhereInput = {};
    if (q && q.trim().length > 0) {
      const term = q.trim();
      where.OR = [
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { company: { contains: term, mode: "insensitive" } },
        { subject: { contains: term, mode: "insensitive" } },
        { message: { contains: term, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (source) where.source = source;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: SUBMISSION_SELECT,
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** Single submission by id, with all fields. */
  async getSubmissionById(id: string) {
    return prisma.contactSubmission.findUnique({
      where: { id },
      select: SUBMISSION_SELECT,
    });
  },

  /** Aggregate counts for the admin dashboard tiles. */
  async getStats() {
    const [total, unread, read, replied, archived, failed] =
      await Promise.all([
        prisma.contactSubmission.count(),
        prisma.contactSubmission.count({ where: { status: "UNREAD" } }),
        prisma.contactSubmission.count({ where: { status: "READ" } }),
        prisma.contactSubmission.count({ where: { status: "REPLIED" } }),
        prisma.contactSubmission.count({ where: { status: "ARCHIVED" } }),
        prisma.contactSubmission.count({ where: { status: "FAILED" } }),
      ]);
    return { total, unread, read, replied, archived, failed };
  },

  async updateStatus(submissionId: string, status: string) {
    return prisma.contactSubmission.update({
      where: { id: submissionId },
      data: { status },
    });
  },

  async replyToSubmission(input: unknown) {
    const validated = ContactReplySchema.parse(input);
    const submission = await prisma.contactSubmission.findUnique({
      where: { id: validated.submissionId },
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    await emailService.sendContactReplyEmail(
      submission.email,
      submission.fullName,
      validated.replyMessage,
    );
    await prisma.contactSubmission.update({
      where: { id: validated.submissionId },
      data: { status: "REPLIED" },
    });

    return submission;
  },

  async exportSubmissions(filters: ListContactSubmissionsFilters = {}) {
    const where: Prisma.ContactSubmissionWhereInput = {};
    if (filters.q && filters.q.trim().length > 0) {
      const term = filters.q.trim();
      where.OR = [
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { company: { contains: term, mode: "insensitive" } },
        { subject: { contains: term, mode: "insensitive" } },
        { message: { contains: term, mode: "insensitive" } },
      ];
    }
    if (filters.status) where.status = filters.status;
    if (filters.source) where.source = filters.source;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }
    return prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        company: true,
        role: true,
        subject: true,
        message: true,
        status: true,
        source: true,
        createdAt: true,
      },
    });
  },
};
