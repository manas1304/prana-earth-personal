import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/core/database/prisma";
import { contactService } from "./contact.service";

// The real `emailService` logs a warning and returns early when AWS
// SES isn't configured, so we don't need to mock it — the side effect
// is harmless in tests.

// ---------------------------------------------------------------------------
// createSubmission
// ---------------------------------------------------------------------------

const SAMPLE_SUBMISSION = {
  id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  userId: null,
  fullName: "John Doe",
  email: "john.doe@company.com",
  phone: null,
  company: "Acme Corp",
  role: "Sustainability Director",
  subject: "I want a climate risk assessment",
  message: "Looking for a corporate-level climate risk assessment please.",
  status: "UNREAD",
  source: "marketplace-contact",
  metadata: { company: "Acme Corp", role: "Sustainability Director" },
  createdAt: new Date("2026-08-23T10:00:00Z"),
  updatedAt: new Date("2026-08-23T10:00:00Z"),
};

test("createSubmission lifts company + role to first-class columns (NOT buried in metadata)", async (t) => {
  const original = prisma.contactSubmission.create;
  let captured: any = null;
  // @ts-expect-error — narrow signature for the test spy
  prisma.contactSubmission.create = async (args: any) => {
    captured = args.data;
    return { ...SAMPLE_SUBMISSION, ...args.data };
  };
  t.after(() => {
    prisma.contactSubmission.create = original;
  });

  // The marketplace contact form still sends company/role via
  // `metadata` (existing behavior, line 33 of
  // src/app/sites/marketplace/contact/page.tsx). The service
  // must lift them to the new first-class columns.
  await contactService.createSubmission({
    fullName: "John Doe",
    email: "john.doe@company.com",
    message: "Looking for a corporate-level climate risk assessment please.",
    subject: "I want a climate risk assessment",
    metadata: { company: "Acme Corp", role: "Sustainability Director" },
  });

  assert.equal(captured.company, "Acme Corp");
  assert.equal(captured.role, "Sustainability Director");
});

test("createSubmission accepts first-class company + role directly", async (t) => {
  const original = prisma.contactSubmission.create;
  let captured: any = null;
  // @ts-expect-error
  prisma.contactSubmission.create = async (args: any) => {
    captured = args.data;
    return { ...SAMPLE_SUBMISSION, ...args.data };
  };
  t.after(() => {
    prisma.contactSubmission.create = original;
  });

  await contactService.createSubmission({
    fullName: "Jane Roe",
    email: "jane@example.com",
    message: "Need an assessment for our data centres.",
    company: "Greentech Solutions",
    role: "Sustainability Manager",
  });

  assert.equal(captured.company, "Greentech Solutions");
  assert.equal(captured.role, "Sustainability Manager");
});

test("createSubmission defaults source to 'marketplace' when omitted", async (t) => {
  const original = prisma.contactSubmission.create;
  let captured: any = null;
  // @ts-expect-error
  prisma.contactSubmission.create = async (args: any) => {
    captured = args.data;
    return SAMPLE_SUBMISSION;
  };
  t.after(() => {
    prisma.contactSubmission.create = original;
  });

  await contactService.createSubmission({
    fullName: "Anon",
    email: "anon@example.com",
    message: "Just a quick question about the platform.",
  });
  assert.equal(captured.source, "marketplace");
});

test("createSubmission still validates the schema (rejects short message)", async () => {
  await assert.rejects(
    () =>
      contactService.createSubmission({
        fullName: "X",
        email: "x@x.com",
        message: "too short",
      }),
    /Full name is required|Please share a little more detail/,
  );
});

// ---------------------------------------------------------------------------
// listSubmissions — filter behaviour
// ---------------------------------------------------------------------------

test("listSubmissions applies q, status, source filters", async (t) => {
  const originalFind = prisma.contactSubmission.findMany;
  const originalCount = prisma.contactSubmission.count;
  let capturedWhere: any = null;
  // @ts-expect-error
  prisma.contactSubmission.findMany = async (args: any) => {
    capturedWhere = args.where;
    return [SAMPLE_SUBMISSION];
  };
  // @ts-expect-error
  prisma.contactSubmission.count = async () => 1;
  t.after(() => {
    prisma.contactSubmission.findMany = originalFind;
    prisma.contactSubmission.count = originalCount;
  });

  await contactService.listSubmissions({
    q: "Acme",
    status: "UNREAD",
    source: "marketplace-contact",
    from: "2026-08-01",
    to: "2026-08-31",
    page: 1,
    pageSize: 20,
  });

  assert.equal(capturedWhere.status, "UNREAD");
  assert.equal(capturedWhere.source, "marketplace-contact");
  assert.ok(capturedWhere.createdAt.gte instanceof Date);
  assert.ok(capturedWhere.createdAt.lte instanceof Date);
  // q → OR across the searched fields
  assert.ok(Array.isArray(capturedWhere.OR));
  assert.equal(capturedWhere.OR.length, 5);
});

test("listSubmissions OR-search includes the new company column", async (t) => {
  const originalFind = prisma.contactSubmission.findMany;
  const originalCount = prisma.contactSubmission.count;
  let capturedWhere: any = null;
  // @ts-expect-error
  prisma.contactSubmission.findMany = async (args: any) => {
    capturedWhere = args.where;
    return [];
  };
  // @ts-expect-error
  prisma.contactSubmission.count = async () => 0;
  t.after(() => {
    prisma.contactSubmission.findMany = originalFind;
    prisma.contactSubmission.count = originalCount;
  });

  await contactService.listSubmissions({ q: "Acme" });

  const orFields = capturedWhere.OR.map(
    (clause: any) => Object.keys(clause)[0],
  );
  // The 5 searched fields must include the new `company` column.
  assert.ok(orFields.includes("company"));
  assert.ok(orFields.includes("fullName"));
  assert.ok(orFields.includes("email"));
  assert.ok(orFields.includes("subject"));
  assert.ok(orFields.includes("message"));
});

test("listSubmissions omits the OR clause when q is empty", async (t) => {
  const originalFind = prisma.contactSubmission.findMany;
  const originalCount = prisma.contactSubmission.count;
  let capturedWhere: any = null;
  // @ts-expect-error
  prisma.contactSubmission.findMany = async (args: any) => {
    capturedWhere = args.where;
    return [];
  };
  // @ts-expect-error
  prisma.contactSubmission.count = async () => 0;
  t.after(() => {
    prisma.contactSubmission.findMany = originalFind;
    prisma.contactSubmission.count = originalCount;
  });

  await contactService.listSubmissions({});
  assert.equal(capturedWhere.OR, undefined);
});

test("listSubmissions selects the new company + role columns", async (t) => {
  const originalFind = prisma.contactSubmission.findMany;
  const originalCount = prisma.contactSubmission.count;
  let capturedSelect: any = null;
  // @ts-expect-error
  prisma.contactSubmission.findMany = async (args: any) => {
    capturedSelect = args.select;
    return [];
  };
  // @ts-expect-error
  prisma.contactSubmission.count = async () => 0;
  t.after(() => {
    prisma.contactSubmission.findMany = originalFind;
    prisma.contactSubmission.count = originalCount;
  });

  await contactService.listSubmissions({});
  assert.equal(capturedSelect.company, true);
  assert.equal(capturedSelect.role, true);
  assert.equal(capturedSelect.fullName, true);
  assert.equal(capturedSelect.email, true);
  assert.equal(capturedSelect.subject, true);
  assert.equal(capturedSelect.message, true);
  assert.equal(capturedSelect.status, true);
  assert.equal(capturedSelect.source, true);
});

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

test("getStats returns counts grouped by status", async (t) => {
  const originalCount = prisma.contactSubmission.count;
  const calls: any[] = [];
  // @ts-expect-error
  prisma.contactSubmission.count = async (args: any) => {
    calls.push(args);
    return 7;
  };
  t.after(() => {
    prisma.contactSubmission.count = originalCount;
  });

  const stats = await contactService.getStats();
  assert.equal(stats.total, 7);
  assert.equal(stats.unread, 7);
  // Total = sum of all status counts (the implementation does
  // count + 5 status counts, all return 7 here).
  assert.equal(calls.length, 6);
});

// ---------------------------------------------------------------------------
// getSubmissionById
// ---------------------------------------------------------------------------

test("getSubmissionById selects all fields including company + role", async (t) => {
  const original = prisma.contactSubmission.findUnique;
  let captured: any = null;
  // @ts-expect-error
  prisma.contactSubmission.findUnique = async (args: any) => {
    captured = args;
    return SAMPLE_SUBMISSION;
  };
  t.after(() => {
    prisma.contactSubmission.findUnique = original;
  });

  const result = await contactService.getSubmissionById("abc");
  assert.equal(captured.where.id, "abc");
  assert.equal(captured.select.company, true);
  assert.equal(captured.select.role, true);
  assert.equal(captured.select.metadata, true);
  assert.equal(result?.company, "Acme Corp");
});
