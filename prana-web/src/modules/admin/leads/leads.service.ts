import { prisma } from "@/core/database/prisma";
import { Prisma } from "@/generated/prisma/client";

export interface GetLeadsFilters {
  page?: number;
  limit?: number;
}

export const adminLeadsService = {
  /**
   * Fetches paginated leads (combining Express Interests and DPR Requests)
   */
  async getLeads(filters: GetLeadsFilters = {}) {
    const { page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    // Use raw SQL to UNION both tables and sort them accurately by creation date
    const leadsRaw = await prisma.$queryRaw<
      {
        id: string;
        userName: string | null;
        projectName: string | null;
        type: string;
        status: string | null;
        createdAt: Date;
      }[]
    >`
      SELECT 
        e.id,
        u."full_name" as "userName",
        p.title as "projectName",
        'Express Interest' as type,
        e.status::text as status,
        e.created_at as "createdAt"
      FROM express_interests e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN projects p ON e.project_id = p.id

      UNION ALL

      SELECT 
        d.id,
        u."full_name" as "userName",
        p.title as "projectName",
        'DPR Inquiry' as type,
        d.status::text as status,
        d.created_at as "createdAt"
      FROM dpr_requests d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN projects p ON d.project_id = p.id

      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Fetch total count for pagination
    const totalCountQuery = await prisma.$queryRaw<
      { total: bigint }[]
    >`
      SELECT (
        (SELECT COUNT(*) FROM express_interests) + 
        (SELECT COUNT(*) FROM dpr_requests)
      ) as total
    `;

    const total = Number(totalCountQuery[0]?.total || 0);
    const totalPages = Math.ceil(total / limit);

    const leads = leadsRaw.map((lead) => ({
      id: lead.id,
      name: lead.userName || "Unknown User",
      project: lead.projectName || "N/A",
      type: lead.type,
      status: lead.status || "NEW",
      createdAt: lead.createdAt,
    }));

    return {
      leads,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  },
};
