import { prisma } from "@/core/database/prisma";
import { ImplementationPartnerStatus, PartnerType } from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartnerStatusFilter = "ACTIVE" | "UNDER_REVIEW" | "INACTIVE" | null;
export type PartnerTypeFilter = keyof typeof PartnerType | null;

export interface GetPartnersFilters {
  search?: string;
  status?: PartnerStatusFilter;
  type?: PartnerTypeFilter;
  region?: string;
  page?: number;
  limit?: number;
}

export interface CreatePartnerData {
  name: string;
  type?: PartnerType;
  websiteUrl?: string;
  logoUrl?: string;
  region?: string;
  country?: string;
  capabilities?: string[];
  activeProjects?: number;
  totalImpact?: string;
  status?: ImplementationPartnerStatus;
  /// Tax / registration ID — captured in the partner edit modal
  /// (mapped to `tax_id` column).
  taxId?: string | null;
}

export type UpdatePartnerData = Partial<CreatePartnerData>;

// ─── Helper: generate readable partner ID ────────────────────────────────────

async function generatePartnerId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.implementationPartner.count();
  // Pad to 2 digits, append a letter suffix cycling A–Z
  const num = String(count + 1).padStart(2, "0");
  const letterIndex = count % 26;
  const letter = String.fromCharCode(65 + letterIndex); // A–Z
  return `PRT-${year}-${num}${letter}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const implementationPartnersService = {
  /**
   * Returns a paginated, filtered list of implementation partners.
   */
  async getPartners(filters: GetPartnersFilters = {}) {
    const {
      search,
      status,
      type,
      region,
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { partnerId: { contains: search, mode: "insensitive" } },
        { region: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status as ImplementationPartnerStatus;
    }

    if (type) {
      where.type = type as PartnerType;
    }

    if (region) {
      where.region = { contains: region, mode: "insensitive" };
    }

    const [partners, total] = await Promise.all([
      prisma.implementationPartner.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          partnerId: true,
          name: true,
          type: true,
          region: true,
          country: true,
          activeProjects: true,
          totalImpact: true,
          status: true,
          logoUrl: true,
          createdAt: true,
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      prisma.implementationPartner.count({ where }),
    ]);

    return {
      partners,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Returns full details for a single partner by ID (UUID or partnerId string).
   */
  async getPartnerById(id: string) {
    // Support both UUID and readable partner ID (PRT-YYYY-NNX)
    const isReadableId = id.startsWith("PRT-");

    return prisma.implementationPartner.findFirst({
      where: {
        deletedAt: null,
        ...(isReadableId ? { partnerId: id } : { id }),
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    });
  },

  /**
   * Creates a new implementation partner with an auto-generated readable partner ID.
   */
  async createPartner(data: CreatePartnerData, createdById: string) {
    const partnerId = await generatePartnerId();

    return prisma.implementationPartner.create({
      data: {
        partnerId,
        name: data.name,
        type: data.type,
        websiteUrl: data.websiteUrl,
        logoUrl: data.logoUrl,
        region: data.region,
        country: data.country,
        capabilities: data.capabilities ?? [],
        activeProjects: data.activeProjects ?? 0,
        totalImpact: data.totalImpact,
        status: data.status ?? ImplementationPartnerStatus.UNDER_REVIEW,
        taxId: data.taxId ?? null,
        createdById,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  },

  /**
   * Partially updates a partner's fields. Only provided fields are changed.
   */
  async updatePartner(id: string, data: UpdatePartnerData) {
    const partner = await prisma.implementationPartner.findFirst({
      where: { id, deletedAt: null },
    });

    if (!partner) {
      throw new Error("Implementation partner not found.");
    }

    return prisma.implementationPartner.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.region !== undefined && { region: data.region }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.capabilities !== undefined && { capabilities: data.capabilities }),
        ...(data.activeProjects !== undefined && { activeProjects: data.activeProjects }),
        ...(data.totalImpact !== undefined && { totalImpact: data.totalImpact }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.taxId !== undefined && { taxId: data.taxId }),
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  },

  /**
   * Soft-deletes a partner (sets deletedAt; data is preserved).
   */
  async deletePartner(id: string) {
    const partner = await prisma.implementationPartner.findFirst({
      where: { id, deletedAt: null },
    });

    if (!partner) {
      throw new Error("Implementation partner not found.");
    }

    return prisma.implementationPartner.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, partnerId: true, name: true, deletedAt: true },
    });
  },

  /**
   * Public listing used by the marketplace `ImplementationPartners`
   * carousel. Only `ACTIVE` partners are returned.
   */
  async getPublicPartners() {
    return prisma.implementationPartner.findMany({
      where: { deletedAt: null, status: ImplementationPartnerStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        partnerId: true,
        name: true,
        type: true,
        logoUrl: true,
        region: true,
        country: true,
        activeProjects: true,
        totalImpact: true,
        capabilities: true,
      },
    });
  },

  /**
   * Returns a CSV blob of all partners matching the same filters as
   * `getPartners` for admin export.
   */
  async exportPartnersCsv(filters: GetPartnersFilters = {}): Promise<string> {
    const {
      search,
      status,
      type,
      region,
    } = filters;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { partnerId: { contains: search, mode: "insensitive" } },
        { region: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status as ImplementationPartnerStatus;
    if (type) where.type = type as PartnerType;
    if (region) where.region = { contains: region, mode: "insensitive" };

    const partners = await prisma.implementationPartner.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        partnerId: true,
        name: true,
        type: true,
        websiteUrl: true,
        region: true,
        country: true,
        capabilities: true,
        activeProjects: true,
        totalImpact: true,
        status: true,
        taxId: true,
        createdAt: true,
      },
    });

    const header = [
      "Partner ID",
      "Name",
      "Type",
      "Website",
      "Region",
      "Country",
      "Capabilities",
      "Active Projects",
      "Total Impact",
      "Status",
      "Tax ID",
      "Created At",
    ].join(",");

    const escape = (v: unknown) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };

    const rows = partners.map((p) =>
      [
        p.partnerId,
        p.name,
        p.type,
        p.websiteUrl,
        p.region,
        p.country,
        (p.capabilities ?? []).join("; "),
        p.activeProjects,
        p.totalImpact,
        p.status,
        p.taxId,
        p.createdAt?.toISOString() ?? "",
      ]
        .map(escape)
        .join(","),
    );

    return [header, ...rows].join("\n");
  },
};
