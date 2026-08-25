import { prisma } from "@/core/database/prisma";

/**
 * UUID v1-5 regex. `Project.id` is `@db.Uuid` in Postgres, so the
 * `DPRRequest.projectId` and `ExpressInterest.projectId` foreign keys
 * always expect a UUID. The route param, however, is `[slug]` and
 * the public APIs accept either id or slug — so we normalise here.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a project identifier to the canonical UUID.
 *
 * - If `identifier` is a UUID, returns it unchanged.
 * - If it's a slug, looks up `Project.slug` and returns the row's
 *   `id`. Throws `NotFoundError` if no project matches.
 *
 * Used by `dpr.service.ts` and `express-interest.service.ts` so the
 * FK constraint never rejects a slug-shaped value from the public
 * forms at `src/app/sites/marketplace/projects/[slug]/...`.
 */
export async function resolveProjectId(identifier: string): Promise<string> {
  if (UUID_REGEX.test(identifier)) return identifier;
  const project = await prisma.project.findUnique({
    where: { slug: identifier },
    select: { id: true },
  });
  if (!project) {
    throw new Error(`Project not found: ${identifier}`);
  }
  return project.id;
}

/** Exposed for unit testing. */
export const __testing = { UUID_REGEX };
