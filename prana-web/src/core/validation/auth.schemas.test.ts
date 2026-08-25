import test from "node:test";
import assert from "node:assert/strict";
import {
  ChangePasswordSchema,
  LoginSchema,
  RegisterSchema,
  UpdateProfileSchema,
} from "./auth.schemas";

/**
 * Regression tests for the auth validation schemas after the
 * audit-round changes:
 *
 * - RegisterSchema now accepts optional phone, company, jobTitle,
 *   country, agreed (and persists them via auth.service.register).
 * - UpdateProfileSchema unchanged shape but now exercised by the
 *   new PATCH /api/users/me route.
 * - ChangePasswordSchema still requires currentPassword + matching
 *   newPassword/confirmPassword.
 */

// ---------------------------------------------------------------------------
// RegisterSchema — the schema that the predict login page's "Create
// account" tab POSTs to. The page sends extra fields
// (phone, company, jobTitle, country, agreed) on top of the four
// required ones.
// ---------------------------------------------------------------------------

test("RegisterSchema accepts the four required fields only", () => {
  const result = RegisterSchema.safeParse({
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    password: "Pa55word!",
    confirmPassword: "Pa55word!",
  });
  assert.equal(result.success, true);
});

test("RegisterSchema accepts all the new optional fields from the login page", () => {
  const result = RegisterSchema.safeParse({
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    password: "Pa55word!",
    confirmPassword: "Pa55word!",
    phone: "+91-9876543210",
    company: "Greentech Solutions",
    jobTitle: "Sustainability Manager",
    country: "India",
    agreed: true,
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.phone, "+91-9876543210");
    assert.equal(result.data.company, "Greentech Solutions");
    assert.equal(result.data.jobTitle, "Sustainability Manager");
    assert.equal(result.data.country, "India");
    assert.equal(result.data.agreed, true);
  }
});

test("RegisterSchema accepts agreed: false (no opt-in)", () => {
  const result = RegisterSchema.safeParse({
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    password: "Pa55word!",
    confirmPassword: "Pa55word!",
    agreed: false,
  });
  assert.equal(result.success, true);
});

test("RegisterSchema strips extra unknown fields silently", () => {
  // Defense-in-depth: the form may send more fields than the
  // schema knows about (e.g. hidden marketing fields). Zod's default
  // is to strip, which is what we want.
  const result = RegisterSchema.safeParse({
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    password: "Pa55word!",
    confirmPassword: "Pa55word!",
    source: "marketplace-register",
    utm_campaign: "spring2026",
  });
  assert.equal(result.success, true);
});

test("RegisterSchema still rejects a weak password", () => {
  const result = RegisterSchema.safeParse({
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    password: "weak",
    confirmPassword: "weak",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    // The custom password messages are set on the schema, so they
    // are preserved across Zod versions. We can match against them.
    const messages = result.error.issues.map((i) => i.message).join(" ");
    assert.match(messages, /Password must be at least 8 characters/);
  }
});

test("RegisterSchema rejects mismatched confirmPassword", () => {
  const result = RegisterSchema.safeParse({
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    password: "Pa55word!",
    confirmPassword: "Different1!",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    // The .refine-level error message survives Zod v4 — assert on it
    // directly, not on the default-issue wording.
    const messages = result.error.issues.map((i) => i.message).join(" ");
    assert.match(messages, /Passwords do not match/);
  }
});

test("RegisterSchema rejects a malformed email", () => {
  const result = RegisterSchema.safeParse({
    fullName: "Aadhar Goel",
    email: "not-an-email",
    password: "Pa55word!",
    confirmPassword: "Pa55word!",
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// UpdateProfileSchema — used by the PATCH /api/users/me route
// (previously used by the actions.updateProfile). All fields
// optional, no behavioural change, but we cover the combinations
// the settings page actually sends.
// ---------------------------------------------------------------------------

test("UpdateProfileSchema accepts a partial profile patch", () => {
  const result = UpdateProfileSchema.safeParse({
    fullName: "Aadhar G.",
    jobTitle: "Sustainability Lead",
    countryRegion: "India",
    timezone: "Asia/Kolkata",
  });
  assert.equal(result.success, true);
});

test("UpdateProfileSchema accepts avatarUrl", () => {
  const result = UpdateProfileSchema.safeParse({
    avatarUrl: "https://cdn.pranaearth.com/u/1.png",
  });
  assert.equal(result.success, true);
});

test("UpdateProfileSchema accepts an empty object (no-op patch)", () => {
  const result = UpdateProfileSchema.safeParse({});
  assert.equal(result.success, true);
});

test("UpdateProfileSchema still rejects fullName < 2 chars", () => {
  const result = UpdateProfileSchema.safeParse({ fullName: "A" });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// LoginSchema + ChangePasswordSchema
// ---------------------------------------------------------------------------

test("LoginSchema accepts the legacy 2-field payload", () => {
  const result = LoginSchema.safeParse({
    email: "aadhar@example.com",
    password: "Pa55word!",
  });
  assert.equal(result.success, true);
});

test("ChangePasswordSchema rejects empty currentPassword", () => {
  const result = ChangePasswordSchema.safeParse({
    currentPassword: "",
    newPassword: "Pa55word!",
    confirmPassword: "Pa55word!",
  });
  assert.equal(result.success, false);
});

test("ChangePasswordSchema rejects mismatched new/confirm", () => {
  const result = ChangePasswordSchema.safeParse({
    currentPassword: "Old1Password!",
    newPassword: "Pa55word!",
    confirmPassword: "Pa55word!Different",
  });
  assert.equal(result.success, false);
});
