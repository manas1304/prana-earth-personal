import { prisma } from "@/core/database/prisma";
import {
  Project,
  ProjectStatus,
  ProjectVisibility,
  ProjectApprovalStatus,
} from "@/generated/prisma/client";

export interface ProjectFilters {
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  approvalStatus?: ProjectApprovalStatus;
  search?: string;
  projectType?: string;
  sector?: string;
  limit?: number;
  offset?: number;
  sdg?: string;
}

export const projectRepository = {
  async findMany(filters: ProjectFilters) {
    const where: any = {
      deletedAt: null,
    };

    if (filters.status) where.status = filters.status;
    if (filters.visibility) where.visibility = filters.visibility;
    if (filters.approvalStatus) where.approvalStatus = filters.approvalStatus;
    if (filters.projectType) where.projectType = filters.projectType;
    if (filters.sector) where.sector = filters.sector;
    if (filters.sdg) {
      where.metadata = {
        path: ["targetSdgs"],
        array_contains: [filters.sdg],
      };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { location: { contains: filters.search, mode: "insensitive" } },
        { country: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters.limit ?? 10,
        skip: filters.offset ?? 0,
      }),
    ]);

    return { total, items };
  },

  async findById(id: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async findBySlug(slug: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { slug, deletedAt: null },
    });
  },

  async create(data: any): Promise<Project> {
    return prisma.project.create({
      data,
    });
  },

  async update(id: string, data: any): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data,
    });
  },

  async softDelete(id: string): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async saveProjectForUser(userId: string, projectId: string) {
    return prisma.savedProject.upsert({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      create: {
        userId,
        projectId,
      },
      update: {},
    });
  },

  async unsaveProjectForUser(userId: string, projectId: string) {
    return prisma.savedProject.deleteMany({
      where: {
        userId,
        projectId,
      },
    });
  },

  async findSavedProjectsByUser(userId: string) {
    return prisma.savedProject.findMany({
      where: { userId },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async isProjectSavedByUser(userId: string, projectId: string) {
    return prisma.savedProject.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });
  },
};
