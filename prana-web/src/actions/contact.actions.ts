"use server";

import { revalidatePath } from "next/cache";
import { contactService } from "@/modules/shared/contact/contact.service";
import { successResponse } from "@/core/responses/success-response";
import { logger } from "@/core/logger/pino";
import type {
  ContactReplyInput,
  ContactSubmissionInput,
} from "@/core/validation/contact.schemas";

export async function submitContactForm(input: ContactSubmissionInput) {
  try {
    const submission = await contactService.createSubmission(input);
    revalidatePath("/sites/admin/contact-requests");
    return successResponse("Thanks! Your message has been received.", {
      submission,
    });
  } catch (error) {
    logger.error({ error }, "Failed to submit contact form");
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to submit contact request.",
    };
  }
}

export async function getContactSubmissions(
  pageOrFilters: number | {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
    source?: string;
    from?: string;
    to?: string;
  } = 1,
  pageSize: number = 20,
) {
  try {
    const filters =
      typeof pageOrFilters === "number"
        ? { page: pageOrFilters, pageSize }
        : pageOrFilters;
    return successResponse(
      "Contact submissions fetched successfully.",
      await contactService.listSubmissions(filters),
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch contact submissions");
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to fetch submissions.",
    };
  }
}

export async function getContactSubmissionStats() {
  try {
    const stats = await contactService.getStats();
    return successResponse("Contact submission stats fetched successfully.", stats);
  } catch (error) {
    logger.error({ error }, "Failed to fetch contact submission stats");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to fetch stats.",
    };
  }
}

export async function updateContactStatus(
  submissionId: string,
  status: string,
) {
  try {
    const submission = await contactService.updateStatus(submissionId, status);
    revalidatePath("/sites/admin/contact-requests");
    return successResponse("Status updated.", { submission });
  } catch (error) {
    logger.error({ error }, "Failed to update contact status");
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to update status.",
    };
  }
}

export async function replyToContactSubmission(input: ContactReplyInput) {
  try {
    const submission = await contactService.replyToSubmission(input);
    revalidatePath("/sites/admin/contact-requests");
    return successResponse("Reply sent successfully.", { submission });
  } catch (error) {
    logger.error({ error }, "Failed to reply to contact submission");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to send reply.",
    };
  }
}

export async function exportContactSubmissions(
  filters: {
    q?: string;
    status?: string;
    source?: string;
    from?: string;
    to?: string;
  } = {},
) {
  try {
    const rows = await contactService.exportSubmissions(filters);
    const csv = [
      [
        "id",
        "fullName",
        "email",
        "phone",
        "company",
        "role",
        "subject",
        "message",
        "status",
        "source",
        "createdAt",
      ].join(","),
      ...rows.map((row) =>
        [
          row.id,
          `"${String(row.fullName ?? "").replace(/"/g, '""')}"`,
          `"${String(row.email ?? "").replace(/"/g, '""')}"`,
          `"${String(row.phone ?? "").replace(/"/g, '""')}"`,
          `"${String(row.company ?? "").replace(/"/g, '""')}"`,
          `"${String(row.role ?? "").replace(/"/g, '""')}"`,
          `"${String(row.subject ?? "").replace(/"/g, '""')}"`,
          `"${String(row.message ?? "").replace(/"/g, '""')}"`,
          `"${String(row.status ?? "").replace(/"/g, '""')}"`,
          `"${String(row.source ?? "").replace(/"/g, '""')}"`,
          `"${String(row.createdAt?.toISOString?.() ?? "").replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ].join("\n");

    return successResponse("Export ready.", { rows, csv });
  } catch (error) {
    logger.error({ error }, "Failed to export contact submissions");
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to export submissions.",
    };
  }
}
