import { prisma } from "@/core/database/prisma";
import {
  BulkProjectUploadSchema,
  BulkProjectItemInput,
} from "@/core/validation/bulk-project.schemas";
import { s3Service } from "./s3.service";
import { logger } from "@/core/logger/pino";
import { NotFoundError } from "@/core/errors/api-error";

// Helper to generate a URL-safe slug
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export const bulkProjectService = {
  async bulkUpload(input: unknown, publish = false) {
    const validated = BulkProjectUploadSchema.parse(input);
    const createdProjects = [];

    // Use transaction to ensure all projects are uploaded or none
    const result = await prisma.$transaction(async (tx) => {
      const projectsToCreate = [];

      for (const item of validated.projects) {
        let slug = slugify(item.title);
        // Ensure slug uniqueness
        const existing = await tx.project.findUnique({ where: { slug } });
        if (existing) {
          slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const images = item.mediaFiles.filter((m) => m.fileType === "image");
        const bannerUrl = images[0]?.fileUrl || null;
        const thumbnailUrl = images[0]?.fileUrl || null;

        const metadata = {
          subType: item.subType,
          implementationPartner: item.implementationPartner,
          durationYears: item.durationYears,
          totalInvestment: item.totalInvestment,
          primaryAddress: item.primaryAddress,
          sdgs: item.sdgs,
          mediaFiles: item.mediaFiles,
        };

        const project = await tx.project.create({
          data: {
            title: item.title,
            slug,
            description: `Project implementation by ${item.implementationPartner} with focus on ${item.subType}.`,
            location: item.primaryAddress,
            projectType: item.projectType,
            sector: item.subType, // map sector to subType
            fundingTarget: item.totalInvestment,
            currency: "USD",
            tenure: item.durationYears * 12, // duration in months
            thumbnailUrl,
            bannerUrl,
            status: publish ? "FUNDING_OPEN" : "UPCOMING",
            approvalStatus: publish ? "PUBLISHED" : "DRAFT",
            metadata: metadata as any,
          },
        });

        projectsToCreate.push(project);
      }

      return projectsToCreate;
    });

    logger.info({ count: result.length }, "Bulk project upload completed successfully");
    return result;
  },

  async deleteProject(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // 1. Delete associated media files from S3 bucket
    const metadata = (project.metadata as any) || {};
    const mediaFiles = metadata.mediaFiles || [];

    for (const file of mediaFiles) {
      if (file.fileUrl) {
        await s3Service.deleteS3File(file.fileUrl);
      }
    }

    // 2. Also delete thumbnail and banner if they are S3 URLs and not already deleted
    if (project.thumbnailUrl) {
      await s3Service.deleteS3File(project.thumbnailUrl);
    }
    if (project.bannerUrl && project.bannerUrl !== project.thumbnailUrl) {
      await s3Service.deleteS3File(project.bannerUrl);
    }

    // 3. Hard delete project from DB (cascades saved projects)
    await prisma.project.delete({
      where: { id: projectId },
    });

    logger.info({ projectId }, "Deleted project and all associated media from S3 and database");
    return { success: true };
  },

  async getAiContext(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const metadata = (project.metadata as any) || {};

    return {
      projectId: project.id,
      title: project.title,
      slug: project.slug,
      description: project.description,
      projectType: project.projectType,
      subType: metadata.subType || project.sector || "",
      implementationPartner: metadata.implementationPartner || "",
      durationYears: metadata.durationYears || (project.tenure ? Math.round(project.tenure / 12) : 0),
      totalInvestment: metadata.totalInvestment || (project.fundingTarget ? Number(project.fundingTarget) : 0),
      location: project.location,
      country: project.country,
      sdgs: metadata.sdgs || [],
      mediaFiles: metadata.mediaFiles || [],
      pdfs: (metadata.mediaFiles || []).filter((m: any) => m.fileType === "pdf"),
      images: (metadata.mediaFiles || []).filter((m: any) => m.fileType === "image"),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  },
};
