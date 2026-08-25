import test from "node:test";
import assert from "node:assert/strict";
import { implementationPartnersService } from "./implementation-partners.service";
import { prisma } from "@/core/database/prisma";
import { ImplementationPartnerStatus, PartnerType } from "@/generated/prisma/client";

/**
 * Unit tests for the implementation-partner service.
 *
 * The admin UI at
 *   src/app/sites/admin/implementation-partners/page.tsx
 * sends payloads like:
 *   updateImplementationPartner(id, { name, type, websiteUrl, region, capabilities })
 * and the edit modal additionally captures `taxId` (formerly
 * dropped). The service must:
 *
 *   - persist taxId on create + update
 *   - expose ACTIVE-only partners to the public carousel
 *   - emit a CSV with the taxId column
 *
 * These tests stub the prisma client so they don't need a live DB.
 */

const SAMPLE_PARTNER = {
  id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  partnerId: "PRT-2024-01A",
  name: "Green Earth Initiative",
  type: "NGO" as PartnerType,
  websiteUrl: "https://greenearth.org",
  logoUrl: "https://cdn.pranaearth.com/partners/greenearth.png",
  region: "India - Maharashtra",
  country: "India",
  capabilities: ["Reforestation", "Carbon Auditing"],
  activeProjects: 5,
  totalImpact: "45,200 tCO2e",
  status: ImplementationPartnerStatus.ACTIVE,
  taxId: "GSTIN29ABCDE1234F1Z5",
  createdById: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
};

// -----------------------------------------------------------------------
// taxId persistence
// -----------------------------------------------------------------------

test("createPartner persists taxId on the inserted row", async (t) => {
  const originalCreate = prisma.implementationPartner.create;
  const originalCount = prisma.implementationPartner.count;
  let captured: any = null;
  // @ts-expect-error — narrow signature for the test spy
  prisma.implementationPartner.count = async () => 0;
  // @ts-expect-error — narrow signature for the test spy
  prisma.implementationPartner.create = async (args: any) => {
    captured = args.data;
    return { ...SAMPLE_PARTNER, ...args.data };
  };
  t.after(() => {
    prisma.implementationPartner.create = originalCreate;
    prisma.implementationPartner.count = originalCount;
  });
  await implementationPartnersService.createPartner(
    {
      name: "Green Earth Initiative",
      type: "NGO",
      websiteUrl: "https://greenearth.org",
      taxId: "GSTIN29ABCDE1234F1Z5",
    },
    "user-1",
  );
  assert.equal(captured.taxId, "GSTIN29ABCDE1234F1Z5");
});

test("createPartner writes null taxId when omitted (backward-compat)", async (t) => {
  const originalCreate = prisma.implementationPartner.create;
  const originalCount = prisma.implementationPartner.count;
  let captured: any = null;
  // @ts-expect-error
  prisma.implementationPartner.count = async () => 0;
  // @ts-expect-error
  prisma.implementationPartner.create = async (args: any) => {
    captured = args.data;
    return SAMPLE_PARTNER;
  };
  t.after(() => {
    prisma.implementationPartner.create = originalCreate;
    prisma.implementationPartner.count = originalCount;
  });
  await implementationPartnersService.createPartner(
    { name: "Partner without taxId" },
    "user-1",
  );
  assert.equal(captured.taxId, null);
});

test("updatePartner only updates taxId when it's explicitly provided", async (t) => {
  const originalFind = prisma.implementationPartner.findFirst;
  const originalUpdate = prisma.implementationPartner.update;
  // @ts-expect-error
  prisma.implementationPartner.findFirst = async () => SAMPLE_PARTNER;
  let updateArgs: any = null;
  // @ts-expect-error
  prisma.implementationPartner.update = async (args: any) => {
    updateArgs = args;
    return { ...SAMPLE_PARTNER, ...args.data };
  };
  t.after(() => {
    prisma.implementationPartner.findFirst = originalFind;
    prisma.implementationPartner.update = originalUpdate;
  });

  // Case A: taxId explicitly provided -> included in the update
  await implementationPartnersService.updatePartner(SAMPLE_PARTNER.id, {
    taxId: "NEW-TAX-ID-123",
  });
  assert.equal(updateArgs.data.taxId, "NEW-TAX-ID-123");

  // Case B: taxId omitted -> NOT in the update payload (no clobber)
  updateArgs = null;
  await implementationPartnersService.updatePartner(SAMPLE_PARTNER.id, {
    name: "Renamed",
  });
  assert.equal(updateArgs.data.taxId, undefined);
  assert.equal(updateArgs.data.name, "Renamed");
});

// -----------------------------------------------------------------------
// Public listing (carousels on the marketplace)
// -----------------------------------------------------------------------

test("getPublicPartners returns only ACTIVE, non-deleted partners", async (t) => {
  const original = prisma.implementationPartner.findMany;
  let captured: any = null;
  // @ts-expect-error
  prisma.implementationPartner.findMany = async (args: any) => {
    captured = args;
    return [SAMPLE_PARTNER];
  };
  t.after(() => {
    prisma.implementationPartner.findMany = original;
  });
  await implementationPartnersService.getPublicPartners();
  assert.equal(captured.where.deletedAt, null);
  assert.equal(
    captured.where.status,
    ImplementationPartnerStatus.ACTIVE,
  );
  // Must NOT leak internal fields
  assert.equal(captured.select.taxId, undefined);
  assert.equal(captured.select.createdById, undefined);
  assert.equal(captured.select.deletedAt, undefined);
  // Must INCLUDE the carousel-facing fields
  assert.ok(captured.select.logoUrl);
  assert.ok(captured.select.region);
  assert.ok(captured.select.capabilities);
});

// -----------------------------------------------------------------------
// CSV export
// -----------------------------------------------------------------------

test("exportPartnersCsv includes taxId in the header and rows", async (t) => {
  const original = prisma.implementationPartner.findMany;
  // @ts-expect-error
  prisma.implementationPartner.findMany = async () => [
    {
      partnerId: "PRT-2024-01A",
      name: "Green Earth Initiative",
      type: "NGO",
      websiteUrl: "https://greenearth.org",
      region: "India - Maharashtra",
      country: "India",
      capabilities: ["Reforestation", "Carbon Auditing"],
      activeProjects: 5,
      totalImpact: "45,200 tCO2e",
      status: ImplementationPartnerStatus.ACTIVE,
      taxId: "GSTIN29ABCDE1234F1Z5",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
  ];
  t.after(() => {
    prisma.implementationPartner.findMany = original;
  });

  const csv = await implementationPartnersService.exportPartnersCsv();
  const lines = csv.split("\n");
  // Header
  assert.match(lines[0], /Tax ID/);
  // Data row
  assert.match(lines[1], /GSTIN29ABCDE1234F1Z5/);
  // Multi-value capabilities get serialised
  assert.match(lines[1], /Reforestation; Carbon Auditing/);
});

test("exportPartnersCsv escapes commas and quotes in fields", async (t) => {
  const original = prisma.implementationPartner.findMany;
  // @ts-expect-error
  prisma.implementationPartner.findMany = async () => [
    {
      partnerId: "PRT-2024-99Z",
      name: 'Acme, "Co" Ltd',
      type: "OTHER",
      websiteUrl: null,
      region: "Global",
      country: "Earth",
      capabilities: ["Foo"],
      activeProjects: 0,
      totalImpact: null,
      status: ImplementationPartnerStatus.UNDER_REVIEW,
      taxId: null,
      createdAt: null,
    },
  ];
  t.after(() => {
    prisma.implementationPartner.findMany = original;
  });
  const csv = await implementationPartnersService.exportPartnersCsv();
  // The comma + double-quote should be wrapped in quotes, with the
  // inner quotes escaped by doubling.
  assert.match(csv, /"Acme, ""Co"" Ltd"/);
});

test("exportPartnersCsv returns an empty CSV when no partners match", async (t) => {
  const original = prisma.implementationPartner.findMany;
  // @ts-expect-error
  prisma.implementationPartner.findMany = async () => [];
  t.after(() => {
    prisma.implementationPartner.findMany = original;
  });
  const csv = await implementationPartnersService.exportPartnersCsv();
  // Header line only.
  assert.equal(csv.split("\n").length, 1);
  assert.match(csv, /Partner ID/);
});

test("exportPartnersCsv applies the search/status/type/region filters", async (t) => {
  const original = prisma.implementationPartner.findMany;
  let captured: any = null;
  // @ts-expect-error
  prisma.implementationPartner.findMany = async (args: any) => {
    captured = args;
    return [];
  };
  t.after(() => {
    prisma.implementationPartner.findMany = original;
  });
  await implementationPartnersService.exportPartnersCsv({
    search: "green",
    status: ImplementationPartnerStatus.ACTIVE,
    type: "NGO",
    region: "Maharashtra",
  });
  assert.deepEqual(captured.where.OR, [
    { name: { contains: "green", mode: "insensitive" } },
    { partnerId: { contains: "green", mode: "insensitive" } },
    { region: { contains: "green", mode: "insensitive" } },
  ]);
  assert.equal(captured.where.status, ImplementationPartnerStatus.ACTIVE);
  assert.equal(captured.where.type, "NGO");
  assert.equal(
    captured.where.region.contains,
    "Maharashtra",
  );
});

// -----------------------------------------------------------------------
// Existing helper unchanged
// -----------------------------------------------------------------------

test("getPartnerById still accepts both UUID and PRT-* readable id", async (t) => {
  const original = prisma.implementationPartner.findFirst;
  // @ts-expect-error
  prisma.implementationPartner.findFirst = async (args: any) => {
    if (args.where.partnerId === "PRT-2024-01A") {
      return SAMPLE_PARTNER;
    }
    if (args.where.id === SAMPLE_PARTNER.id) {
      return SAMPLE_PARTNER;
    }
    return null;
  };
  t.after(() => {
    prisma.implementationPartner.findFirst = original;
  });

  const byReadable = await implementationPartnersService.getPartnerById(
    "PRT-2024-01A",
  );
  const byUuid = await implementationPartnersService.getPartnerById(
    SAMPLE_PARTNER.id,
  );
  assert.ok(byReadable);
  assert.ok(byUuid);
});
