import { projectRepository, ProjectFilters } from "./project.repository";
import {
  CreateProjectSchema,
  UpdateProjectSchema,
} from "@/core/validation/project.schemas";
import { BadRequestError, NotFoundError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";

// Helper to generate a URL-safe slug
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export const projectService = {
  async getProjects(filters: ProjectFilters) {
    logger.info({ filters }, "Fetching marketplace projects list");
    return projectRepository.findMany(filters);
  },

  async getProjectByIdOrSlug(identifier: string) {
    logger.info({ identifier }, "Fetching project details");
    let project = null;

    // Check if identifier is UUID format, otherwise assume it is a slug
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
      project = await projectRepository.findById(identifier);
    } else {
      project = await projectRepository.findBySlug(identifier);
    }

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    return project;
  },

  async createProject(input: unknown) {
    logger.info("Validating project creation payload");
    const validated = CreateProjectSchema.parse(input);

    let slug = slugify(validated.title);

    // Ensure slug uniqueness
    const existing = await projectRepository.findBySlug(slug);
    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const payload = {
      title: validated.title,
      slug,
      description: validated.description,
      location: validated.location,
      country: validated.country,
      projectType: validated.projectType,
      sector: validated.sector,
      fundingTarget: validated.fundingTarget,
      currency: validated.currency,
      returnRate: validated.returnRate,
      tenure: validated.tenure,
      thumbnailUrl: validated.thumbnailUrl,
      bannerUrl: validated.bannerUrl,
      tags: validated.tags,
      status: validated.status,
      visibility: validated.visibility,
      approvalStatus: validated.approvalStatus,
      organizationId: validated.organizationId,
      metadata: validated.metadata || {},
    };

    logger.info({ slug }, "Creating new marketplace project record");
    const newProject = await projectRepository.create(payload);
    return newProject;
  },

  async updateProject(id: string, input: unknown) {
    logger.info({ id }, "Validating project update payload");
    const project = await projectRepository.findById(id);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const validated = UpdateProjectSchema.parse(input);

    const payload: any = { ...validated };

    if (validated.title && validated.title !== project.title) {
      let slug = slugify(validated.title);
      const existing = await projectRepository.findBySlug(slug);
      if (existing && existing.id !== id) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      payload.slug = slug;
    }

    logger.info({ id }, "Updating marketplace project record");
    const updated = await projectRepository.update(id, payload);
    return updated;
  },

  async deleteProject(id: string) {
    logger.info({ id }, "Soft deleting project");
    const project = await projectRepository.findById(id);
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    await projectRepository.softDelete(id);
    return { success: true };
  },

  async saveProject(projectId: string, userId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const savedProject = await projectRepository.saveProjectForUser(
      userId,
      projectId,
    );
    return { saved: true, savedProject };
  },

  async unsaveProject(projectId: string, userId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const result = await projectRepository.unsaveProjectForUser(
      userId,
      projectId,
    );
    return { saved: false, deletedCount: result.count };
  },

  async getSavedProjects(userId: string) {
    const savedProjects =
      await projectRepository.findSavedProjectsByUser(userId);
    return savedProjects.map((entry) => entry.project);
  },

  async isProjectSaved(projectId: string, userId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const savedProject = await projectRepository.isProjectSavedByUser(
      userId,
      projectId,
    );
    return Boolean(savedProject);
  },
};
