import { z } from "zod";

/**
 * Accept either a UUID (id) or a slug for the projectId. The backend
 * `submitExpressInterest` action resolves it to a real Project row.
 */
const ProjectIdentifier = z
  .string()
  .trim()
  .min(1, "Project is required")
  .max(255);

export const ExpressInterestSubmissionSchema = z.object({
  projectId: ProjectIdentifier,
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("A valid email is required"),
  // Phone is optional — frontend sends "" or null when blank.
  phone: z
    .preprocess(
      (v) => (v == null || v === "" ? undefined : v),
      z.string().trim().max(30).optional()
    ),
  // Company is optional — both "" and null are valid.
  company: z
    .preprocess(
      (v) => (v == null || v === "" ? undefined : v),
      z.string().trim().max(100).optional()
    ),
  message: z
    .preprocess(
      (v) => (v == null || v === "" ? undefined : v),
      z.string().trim().max(2000).optional()
    ),
});

export const ExpressInterestReplySchema = z.object({
  interestId: z.string().uuid("Invalid interest ID"),
  replyMessage: z
    .string()
    .trim()
    .min(5, "Please write a longer reply")
    .max(4000),
  /// Optional status transition alongside the reply
  status: z
    .enum(["NEW", "IN_PROGRESS", "CONTACTED", "RESOLVED", "REJECTED"])
    .optional(),
});

export const ExpressInterestStatusUpdateSchema = z.object({
  interestId: z.string().uuid("Invalid interest ID"),
  status: z.enum(["NEW", "IN_PROGRESS", "CONTACTED", "RESOLVED", "REJECTED"]),
});

export type ExpressInterestSubmissionInput = z.infer<
  typeof ExpressInterestSubmissionSchema
>;
export type ExpressInterestReplyInput = z.infer<
  typeof ExpressInterestReplySchema
>;
export type ExpressInterestStatusUpdateInput = z.infer<
  typeof ExpressInterestStatusUpdateSchema
>;
