import test from "node:test";
import assert from "node:assert/strict";
import {
  DprReplySchema,
  DprStatusUpdateSchema,
  DprSubmissionSchema,
  DprUserMessageSchema,
} from "./dpr.schemas";

/**
 * Regression tests for DPR schemas after the audit.
 *
 * The frontend form at
 *   src/app/sites/marketplace/projects/[slug]/request-dpr/page.tsx
 * sends the full payload (originally all required, now relaxed).
 * The projectId is the slug.
 *
 * The admin leads page calls replyToDprRequest with just
 * `dprRequestId + replyMessage`; we test that still works AND
 * the new optional `status` field.
 */

const SLUG = "amazon-reforestation-initiative";
const UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

test("DprSubmissionSchema accepts a fully-populated payload (UUID)", () => {
  const result = DprSubmissionSchema.safeParse({
    projectId: UUID,
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    phone: "+91-9876543210",
    companyName: "Greentech Solutions",
    industry: "Renewable Energy",
    sustainabilityBudget: "1M-5M",
    primaryMotivation: "ESG",
    companySize: "50-200",
    regionsOfInterest: ["India", "SE Asia"],
    certifications: ["B-Corp"],
    additionalRequirements: "Prefer Q2 start.",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.projectId, UUID);
    assert.deepEqual(result.data.regionsOfInterest, ["India", "SE Asia"]);
    assert.deepEqual(result.data.certifications, ["B-Corp"]);
  }
});

test("DprSubmissionSchema accepts a slug as projectId", () => {
  const result = DprSubmissionSchema.safeParse({
    projectId: SLUG,
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
  });
  assert.equal(result.success, true);
});

test("DprSubmissionSchema accepts the frontend payload with all fields blank except fullName+email", () => {
  // The form can be submitted with only the required fields. The
  // optional ones are either omitted, sent as "", or sent as null.
  const result = DprSubmissionSchema.safeParse({
    projectId: SLUG,
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
  });
  assert.equal(result.success, true);
});

test("DprSubmissionSchema accepts null / empty-string optional fields", () => {
  // Several forms send null for unselected dropdowns/inputs. The
  // preprocess must coerce them to undefined.
  const result = DprSubmissionSchema.safeParse({
    projectId: SLUG,
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    phone: null,
    companyName: null,
    industry: "",
    sustainabilityBudget: null,
    primaryMotivation: null,
    companySize: null,
    additionalRequirements: "",
    regionsOfInterest: [],
    certifications: [],
  });
  assert.equal(
    result.success,
    true,
    "Optional fields with null/empty should be accepted",
  );
});

test("DprSubmissionSchema still requires fullName + email", () => {
  const result = DprSubmissionSchema.safeParse({
    projectId: SLUG,
  });
  assert.equal(result.success, false);
});

test("DprSubmissionSchema still rejects a malformed email", () => {
  const result = DprSubmissionSchema.safeParse({
    projectId: SLUG,
    fullName: "Aadhar Goel",
    email: "not-an-email",
  });
  assert.equal(result.success, false);
});

test("DprSubmissionSchema rejects an empty projectId", () => {
  const result = DprSubmissionSchema.safeParse({
    projectId: "",
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// DprReplySchema (admin reply) — note the new optional `status`.
// ---------------------------------------------------------------------------

test("DprReplySchema accepts the legacy reply payload", () => {
  const result = DprReplySchema.safeParse({
    dprRequestId: UUID,
    replyMessage: "Thank you, we are reviewing your request and will follow up.",
  });
  assert.equal(result.success, true);
});

test("DprReplySchema accepts the new optional status field", () => {
  const result = DprReplySchema.safeParse({
    dprRequestId: UUID,
    replyMessage: "Forwarded to the program manager.",
    status: "IN_PROGRESS",
  });
  assert.equal(result.success, true);
});

test("DprReplySchema rejects a too-short reply", () => {
  const result = DprReplySchema.safeParse({
    dprRequestId: UUID,
    replyMessage: "Hi",
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// DprStatusUpdateSchema — backward-compat: same as before
// ---------------------------------------------------------------------------

test("DprStatusUpdateSchema accepts a string status (backward-compat)", () => {
  const result = DprStatusUpdateSchema.safeParse({
    dprRequestId: UUID,
    status: "RESPONDED",
  });
  assert.equal(result.success, true);
});

// ---------------------------------------------------------------------------
// DprUserMessageSchema (new export) — user-side continuation message
// ---------------------------------------------------------------------------

test("DprUserMessageSchema accepts a valid continuation message", () => {
  const result = DprUserMessageSchema.safeParse({
    dprRequestId: UUID,
    message: "Just following up — any update on this?",
  });
  assert.equal(result.success, true);
});

test("DprUserMessageSchema rejects a short message", () => {
  const result = DprUserMessageSchema.safeParse({
    dprRequestId: UUID,
    message: "ok",
  });
  assert.equal(result.success, false);
});
