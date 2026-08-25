import { z } from "zod";

/**
 * Accept either a UUID (id) or a slug for the projectId — the dynamic
 * route is `[slug]`, so slugs are what the form sends in practice.
 */
const ProjectIdentifier = z
  .string()
  .trim()
  .min(1, "Project is required")
  .max(255);

export const DprSubmissionSchema = z.object({
  projectId: ProjectIdentifier,
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("A valid email is required"),
  // Phone / companyName / industry / etc. are all optional at the
  // form layer — coerce empty strings to undefined before validating.
  phone: z.preprocess(
    (v) => (v == null || v === "" ? undefined : v),
    z.string().trim().max(30).optional()
  ),
  companyName: z.preprocess(
    (v) => (v == null || v === "" ? undefined : v),
    z.string().trim().max(100).optional()
  ),
  industry: z.preprocess(
    (v) => (v == null || v === "" ? undefined : v),
    z.string().trim().max(100).optional()
  ),
  sustainabilityBudget: z.preprocess(
    (v) => (v == null || v === "" ? undefined : v),
    z.string().trim().max(100).optional()
  ),
  primaryMotivation: z.preprocess(
    (v) => (v == null || v === "" ? undefined : v),
    z.string().trim().max(200).optional()
  ),
  companySize: z.string().trim().optional().nullable(),
  regionsOfInterest: z
    .array(z.string())
    .optional()
    .default([]),
  certifications: z
    .array(z.string())
    .optional()
    .default([]),
  additionalRequirements: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable(),
});

export const DprStatusUpdateSchema = z.object({
  dprRequestId: z.string().uuid("Invalid DPR request ID"),
  status: z.string().min(1, "Status is required"),
});

export const DprReplySchema = z.object({
  dprRequestId: z.string().uuid("Invalid DPR request ID"),
  replyMessage: z
    .string()
    .trim()
    .min(5, "Please write a longer reply")
    .max(4000),
  /// Optional status transition alongside the reply (admin)
  status: z
    .enum(["NEW", "IN_PROGRESS", "CONTACTED", "RESOLVED", "REJECTED"])
    .optional(),
});

export const DprUserMessageSchema = z.object({
  dprRequestId: z.string().uuid("Invalid DPR request ID"),
  message: z
    .string()
    .trim()
    .min(5, "Please write a longer message")
    .max(4000),
});

export type DprSubmissionInput = z.infer<typeof DprSubmissionSchema>;
export type DprStatusUpdateInput = z.infer<typeof DprStatusUpdateSchema>;
export type DprReplyInput = z.infer<typeof DprReplySchema>;
export type DprUserMessageInput = z.infer<typeof DprUserMessageSchema>;
