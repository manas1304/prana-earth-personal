import { z } from "zod";

export const MediaFileSchema = z.object({
  fileName: z.string().trim().min(1),
  fileUrl: z.string().trim().url("Invalid media file URL"),
  fileType: z.enum(["image", "pdf"]),
});

export const BulkProjectItemSchema = z.object({
  title: z.string().trim().min(2, "Project title is required").max(255),
  projectType: z.enum(["Water", "Nature"]),
  subType: z.enum(["Groundwater", "Reforestration"]),
  implementationPartner: z.string().trim().min(1, "Implementation partner is required").max(255),
  durationYears: z.number().int().positive("Duration must be a positive number of years"),
  totalInvestment: z.number().positive("Total investment must be a positive number"),
  primaryAddress: z.string().trim().min(1, "Primary address is required").max(500),
  sdgs: z.array(z.number().int().min(1).max(17)).min(1, "At least one SDG is required"),
  mediaFiles: z.array(MediaFileSchema).default([]),
});

export const BulkProjectUploadSchema = z.object({
  projects: z.array(BulkProjectItemSchema).min(1, "At least one project is required to upload"),
});

export const PresignedUrlRequestSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required"),
  contentType: z.string().trim().min(1, "Content type is required"),
});

export type BulkProjectItemInput = z.infer<typeof BulkProjectItemSchema>;
export type BulkProjectUploadInput = z.infer<typeof BulkProjectUploadSchema>;
export type PresignedUrlRequestInput = z.infer<typeof PresignedUrlRequestSchema>;
