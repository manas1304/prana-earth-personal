import test from "node:test";
import assert from "node:assert/strict";
import { __testing, resolveProjectId } from "./project";

/**
 * Unit tests for the project-identifier resolver used by
 * dpr.service.ts and express-interest.service.ts. The slugs
 * originate from `src/app/sites/marketplace/projects/[slug]/...` —
 * the route param is the slug, but `Project.id` (and therefore
 * `DPRRequest.projectId` / `ExpressInterest.projectId`) is `@db.Uuid`.
 *
 * If this helper regressed (e.g. UUID regex dropped, slug lookup
 * removed), every public form submission would 500 with a foreign
 * key constraint error.
 */

const UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

test("UUID_REGEX accepts a canonical lowercase v4 UUID", () => {
  assert.equal(__testing.UUID_REGEX.test(UUID), true);
});

test("UUID_REGEX accepts a canonical uppercase UUID", () => {
  assert.equal(
    __testing.UUID_REGEX.test(UUID.toUpperCase()),
    true,
  );
});

test("UUID_REGEX rejects a slug-shaped string", () => {
  assert.equal(
    __testing.UUID_REGEX.test("my-mangrove-project"),
    false,
  );
});

test("UUID_REGEX rejects an empty string", () => {
  assert.equal(__testing.UUID_REGEX.test(""), false);
});

test("UUID_REGEX rejects a UUID missing hyphens", () => {
  assert.equal(
    __testing.UUID_REGEX.test("86608b0b7fffff7fffff"),
    false,
  );
});

// We can't run `resolveProjectId` without a real Prisma client
// (the test suite has no DB fixture). Instead, we test the
// pre-check branch by stubbing `prisma.project.findUnique`. The
// dynamic import pattern lets us swap the module before resolving.

test("resolveProjectId returns the input unchanged when it is a UUID", async (t) => {
  // Mock prisma to ensure no DB hit happens.
  const { prisma } = await import("@/core/database/prisma");
  const original = prisma.project.findUnique;
  let called = false;
  // @ts-expect-error — narrow signature for the test spy
  prisma.project.findUnique = async () => {
    called = true;
    return null;
  };
  t.after(() => {
    prisma.project.findUnique = original;
  });
  const result = await resolveProjectId(UUID);
  assert.equal(result, UUID);
  assert.equal(
    called,
    false,
    "findUnique must not be called when the input is already a UUID",
  );
});

test("resolveProjectId looks up the project by slug and returns its id", async (t) => {
  const { prisma } = await import("@/core/database/prisma");
  const original = prisma.project.findUnique;
  // @ts-expect-error — narrow signature for the test spy
  prisma.project.findUnique = async (args: any) => {
    assert.equal(args.where.slug, "my-mangrove-project");
    return { id: UUID };
  };
  t.after(() => {
    prisma.project.findUnique = original;
  });
  const result = await resolveProjectId("my-mangrove-project");
  assert.equal(result, UUID);
});

test("resolveProjectId throws when the slug is unknown", async (t) => {
  const { prisma } = await import("@/core/database/prisma");
  const original = prisma.project.findUnique;
  // @ts-expect-error — narrow signature for the test spy
  prisma.project.findUnique = async () => null;
  t.after(() => {
    prisma.project.findUnique = original;
  });
  await assert.rejects(
    () => resolveProjectId("does-not-exist"),
    /Project not found/,
  );
});
