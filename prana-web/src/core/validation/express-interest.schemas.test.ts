import test from "node:test";
import assert from "node:assert/strict";
import {
  ExpressInterestReplySchema,
  ExpressInterestStatusUpdateSchema,
  ExpressInterestSubmissionSchema,
} from "./express-interest.schemas";

/**
 * Regression tests for express-interest schemas after the audit.
 *
 * The frontend form at
 *   src/app/sites/marketplace/projects/[slug]/express-interest/page.tsx
 * sends `phone: formData.phone || null, company: formData.company || null,
 * message: formData.message || null` — i.e. explicit `null` values
 * for the now-optional fields. The schema must accept them.
 *
 * The `projectId` is the slug, not a UUID (the route param is
 * `[slug]`), so the schema must accept any non-empty string.
 */

const SLUG = "amazon-reforestation-initiative";
const UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

test("ExpressInterestSubmissionSchema accepts a fully-populated payload (UUID)", () => {
  const result = ExpressInterestSubmissionSchema.safeParse({
    projectId: UUID,
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    phone: "+91-9876543210",
    company: "Greentech Solutions",
    message: "We'd like to invest in this project.",
  });
  assert.equal(result.success, true);
});

test("ExpressInterestSubmissionSchema accepts a slug as projectId", () => {
  const result = ExpressInterestSubmissionSchema.safeParse({
    projectId: SLUG,
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
  });
  assert.equal(result.success, true);
});

test("ExpressInterestSubmissionSchema accepts the exact payload the frontend sends (with nulls)", () => {
  // Replicating the payload assembled by the express-interest form
  // when the user leaves optional fields blank.
  const frontendPayload = {
    projectId: SLUG,
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    phone: null,
    company: null,
    message: null,
  };
  const result = ExpressInterestSubmissionSchema.safeParse(frontendPayload);
  assert.equal(
    result.success,
    true,
    "Frontend-style null payload must be accepted",
  );
});

test("ExpressInterestSubmissionSchema accepts the exact payload the frontend sends (with empty strings)", () => {
  // Some forms send "" instead of null when a field is blank.
  // The `.preprocess` on each field converts that to undefined so
  // it round-trips cleanly.
  const frontendPayload = {
    projectId: SLUG,
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    phone: "",
    company: "",
    message: "",
  };
  const result = ExpressInterestSubmissionSchema.safeParse(frontendPayload);
  assert.equal(result.success, true);
});

test("ExpressInterestSubmissionSchema coerces undefined optional fields", () => {
  // Some forms omit the fields entirely.
  const result = ExpressInterestSubmissionSchema.safeParse({
    projectId: SLUG,
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.phone, undefined);
    assert.equal(result.data.company, undefined);
    assert.equal(result.data.message, undefined);
  }
});

test("ExpressInterestSubmissionSchema still requires fullName + email", () => {
  const result = ExpressInterestSubmissionSchema.safeParse({
    projectId: SLUG,
  });
  assert.equal(result.success, false);
  if (!result.success) {
    // Zod v4's default error message is
    //   "Invalid input: expected string, received undefined"
    // The schema-level message overrides show up only for our custom
    // messages. We assert on the path + code instead so the test is
    // resilient to the message wording.
    const issuePaths = result.error.issues.map((i) => i.path.join("."));
    assert.ok(issuePaths.includes("fullName"));
    assert.ok(issuePaths.includes("email"));
  }
});

test("ExpressInterestSubmissionSchema still rejects a bad email", () => {
  const result = ExpressInterestSubmissionSchema.safeParse({
    projectId: SLUG,
    fullName: "Aadhar Goel",
    email: "not-an-email",
  });
  assert.equal(result.success, false);
});

test("ExpressInterestSubmissionSchema rejects an empty projectId", () => {
  const result = ExpressInterestSubmissionSchema.safeParse({
    projectId: "",
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
  });
  assert.equal(result.success, false);
});

test("ExpressInterestSubmissionSchema rejects an oversized phone", () => {
  const result = ExpressInterestSubmissionSchema.safeParse({
    projectId: SLUG,
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    phone: "x".repeat(31),
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// ExpressInterestReplySchema (admin reply) — note the new optional
// `status` field.
// ---------------------------------------------------------------------------

test("ExpressInterestReplySchema accepts the legacy reply payload", () => {
  const result = ExpressInterestReplySchema.safeParse({
    interestId: UUID,
    replyMessage: "Thank you for your interest, we will follow up shortly.",
  });
  assert.equal(result.success, true);
});

test("ExpressInterestReplySchema accepts the new optional status field", () => {
  const result = ExpressInterestReplySchema.safeParse({
    interestId: UUID,
    replyMessage: "Forwarded to the program manager.",
    status: "CONTACTED",
  });
  assert.equal(result.success, true);
});

test("ExpressInterestReplySchema still rejects a short reply", () => {
  const result = ExpressInterestReplySchema.safeParse({
    interestId: UUID,
    replyMessage: "Hi",
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// ExpressInterestStatusUpdateSchema (new export)
// ---------------------------------------------------------------------------

test("ExpressInterestStatusUpdateSchema accepts any valid status", () => {
  for (const status of [
    "NEW",
    "IN_PROGRESS",
    "CONTACTED",
    "RESOLVED",
    "REJECTED",
  ]) {
    const result = ExpressInterestStatusUpdateSchema.safeParse({
      interestId: UUID,
      status,
    });
    assert.equal(result.success, true, `expected ${status} to be accepted`);
  }
});

test("ExpressInterestStatusUpdateSchema rejects an unknown status", () => {
  const result = ExpressInterestStatusUpdateSchema.safeParse({
    interestId: UUID,
    status: "MAYBE",
  });
  assert.equal(result.success, false);
});
