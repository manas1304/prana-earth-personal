import { z } from "zod";

const JsonValueSchema: z.ZodTypeAny = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.lazy(() => z.array(JsonValueSchema)),
  z.lazy(() => z.record(z.string(), JsonValueSchema)),
]);

export const ContactSubmissionSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("A valid email is required"),
  phone: z.string().trim().max(30).optional().nullable(),
  /// `company` and `role` are first-class so the admin leads page
  /// can show them without parsing metadata. They remain optional
  /// so callers that previously stuffed them in `metadata` still
  /// work.
  company: z.string().trim().max(255).optional().nullable(),
  role: z.string().trim().max(255).optional().nullable(),
  subject: z.string().trim().max(255).optional().nullable(),
  message: z
    .string()
    .trim()
    .min(10, "Please share a little more detail")
    .max(2000),
  source: z.string().trim().max(100).optional().nullable(),
  metadata: JsonValueSchema.optional().nullable(),
});

export const ContactReplySchema = z.object({
  submissionId: z.string().trim().min(1, "Submission is required"),
  replyMessage: z
    .string()
    .trim()
    .min(5, "Please write a longer reply")
    .max(4000),
});

export type ContactSubmissionInput = z.infer<typeof ContactSubmissionSchema>;
export type ContactReplyInput = z.infer<typeof ContactReplySchema>;
