import test from "node:test";
import assert from "node:assert/strict";
import { ContactReplySchema, ContactSubmissionSchema } from "./contact.schemas";

/**
 * Regression tests for the contact-form validation schemas.
 *
 * The marketplace /contact page sends:
 *   { fullName, email, message, subject, metadata: { company, role } }
 *
 * The predict /contact page sends a similar shape with optional
 * phone and source. Both must validate, and the schema now exposes
 * company + role as first-class optional fields.
 */

// ---------------------------------------------------------------------------
// ContactSubmissionSchema
// ---------------------------------------------------------------------------

test("ContactSubmissionSchema accepts the exact payload the marketplace /contact page sends", () => {
  // This is the literal payload the existing frontend builds at
  // src/app/sites/marketplace/contact/page.tsx:28-34
  const frontendPayload = {
    fullName: "John Doe",
    email: "john.doe@company.com",
    message:
      "Tell us about your climate goals and how we can help you reduce risk.",
    subject: "I want to discuss a corporate assessment",
    metadata: { company: "Acme Corp", role: "Sustainability Director" },
  };
  const result = ContactSubmissionSchema.safeParse(frontendPayload);
  assert.equal(result.success, true);
});

test("ContactSubmissionSchema accepts company + role as first-class fields", () => {
  const result = ContactSubmissionSchema.safeParse({
    fullName: "Jane Doe",
    email: "jane@example.com",
    message: "Looking for a climate risk assessment for our portfolio.",
    company: "Greentech Solutions",
    role: "Sustainability Manager",
    source: "marketplace-contact",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.company, "Greentech Solutions");
    assert.equal(result.data.role, "Sustainability Manager");
    assert.equal(result.data.source, "marketplace-contact");
  }
});

test("ContactSubmissionSchema still rejects an invalid email", () => {
  const result = ContactSubmissionSchema.safeParse({
    fullName: "Jane Doe",
    email: "not-an-email",
    message: "Long enough message to pass the minimum length requirement.",
  });
  assert.equal(result.success, false);
});

test("ContactSubmissionSchema still requires the message (10+ chars)", () => {
  const result = ContactSubmissionSchema.safeParse({
    fullName: "Jane Doe",
    email: "jane@example.com",
    message: "short",
  });
  assert.equal(result.success, false);
});

test("ContactSubmissionSchema rejects an oversized company", () => {
  const result = ContactSubmissionSchema.safeParse({
    fullName: "Jane Doe",
    email: "jane@example.com",
    message: "Long enough message to pass the minimum length requirement.",
    company: "x".repeat(256),
  });
  assert.equal(result.success, false);
});

test("ContactSubmissionSchema rejects an oversized role", () => {
  const result = ContactSubmissionSchema.safeParse({
    fullName: "Jane Doe",
    email: "jane@example.com",
    message: "Long enough message to pass the minimum length requirement.",
    role: "x".repeat(256),
  });
  assert.equal(result.success, false);
});

test("ContactSubmissionSchema accepts null for any optional field", () => {
  const result = ContactSubmissionSchema.safeParse({
    fullName: "Jane Doe",
    email: "jane@example.com",
    message: "Long enough message to pass the minimum length requirement.",
    phone: null,
    company: null,
    role: null,
    subject: null,
    source: null,
    metadata: null,
  });
  assert.equal(result.success, true);
});

test("ContactSubmissionSchema omits optional fields when not provided", () => {
  const result = ContactSubmissionSchema.safeParse({
    fullName: "Jane Doe",
    email: "jane@example.com",
    message: "Long enough message to pass the minimum length requirement.",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.company, undefined);
    assert.equal(result.data.role, undefined);
    assert.equal(result.data.subject, undefined);
    assert.equal(result.data.phone, undefined);
  }
});

// ---------------------------------------------------------------------------
// ContactReplySchema (admin reply — wire the new text input)
// ---------------------------------------------------------------------------

test("ContactReplySchema accepts a valid reply", () => {
  const result = ContactReplySchema.safeParse({
    submissionId: "sub_01HVB4D8Q1",
    replyMessage: "Thank you for reaching out, we will respond within 24h.",
  });
  assert.equal(result.success, true);
});

test("ContactReplySchema rejects an empty replyMessage", () => {
  const result = ContactReplySchema.safeParse({
    submissionId: "sub_01HVB4D8Q1",
    replyMessage: "",
  });
  assert.equal(result.success, false);
});

test("ContactReplySchema rejects a missing submissionId", () => {
  const result = ContactReplySchema.safeParse({
    replyMessage: "Looks good.",
  });
  assert.equal(result.success, false);
});
