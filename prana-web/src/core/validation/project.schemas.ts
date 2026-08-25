import { z } from "zod";

export const CreateProjectSchema = z.object({
  // Required fields
  title: z.string().min(3, "Title must be at least 3 characters").max(255),

  // Optional fields (matching Prisma schema where fields are nullable)
  description: z.string().min(10, "Description must be at least 10 characters").optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  projectType: z.string().max(100).optional().nullable(),
  sector: z.string().max(100).optional().nullable(),
  fundingTarget: z.number().positive("Funding target must be positive").optional().nullable(),
  currency: z.string().max(10).default("USD").optional().nullable(),
  returnRate: z.number().min(0).max(100).optional().nullable(),
  tenure: z.number().int().positive("Tenure must be a positive integer").optional().nullable(),
  thumbnailUrl: z.string().url("Thumbnail must be a valid URL").optional().nullable(),
  bannerUrl: z.string().url("Banner must be a valid URL").optional().nullable(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["ACTIVE", "ONGOING", "COMPLETED", "FUNDING_OPEN", "UPCOMING"]).default("UPCOMING").optional(),
  visibility: z.enum(["PUBLIC", "SUBSCRIBER_ONLY"]).default("PUBLIC").optional(),
  approvalStatus: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).default("DRAFT").optional(),
  organizationId: z.string().uuid("Invalid organization ID").optional().nullable(),
  metadata: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    implementationPartner: z.string().optional(),
    targetSdgs: z.array(z.string()).optional(),
    coreMetrics: z.array(
      z.object({
        name: z.string(),
        value: z.number(),
        unit: z.string(),
      })
    ).optional(),
    documents: z.array(
      z.object({
        name: z.string(),
        url: z.string().url(),
      })
    ).optional(),
  }).optional().nullable(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const ProjectFiltersSchema = z.object({
  status: z.enum(["ACTIVE", "ONGOING", "COMPLETED", "FUNDING_OPEN", "UPCOMING"]).optional(),
  visibility: z.enum(["PUBLIC", "SUBSCRIBER_ONLY"]).optional(),
  approvalStatus: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
  search: z.string().optional(),
  projectType: z.string().optional(),
  sector: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(10).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});
