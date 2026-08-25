import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeUser } from "./user";

/**
 * Sanity check: the pre-existing `user.test.ts` covers a happy path
 * for `sanitizeUser`. This file adds a few more edge cases so a
 * regression in the sanitiser (e.g. someone drops the new profile
 * fields from the return value) trips a clear test failure.
 */

test("sanitizeUser returns null for every nullable field when omitted", () => {
  const result = sanitizeUser({
    id: "u",
    email: "u@x.com",
    fullName: "U",
  });
  assert.equal(result.id, "u");
  assert.equal(result.email, "u@x.com");
  assert.equal(result.fullName, "U");
  assert.equal(result.avatarUrl, null);
  assert.equal(result.isEmailVerified, false);
  assert.equal(result.phone, null);
  assert.equal(result.jobTitle, null);
  assert.equal(result.countryRegion, null);
  assert.equal(result.timezone, null);
  assert.equal(result.locale, null);
});

test("sanitizeUser defaults role to undefined (so the API caller can fall back)", () => {
  const result = sanitizeUser({
    id: "u",
    email: "u@x.com",
    fullName: "U",
  });
  assert.equal(result.role, undefined);
});

test("sanitizeUser preserves role when provided", () => {
  const result = sanitizeUser({
    id: "u",
    email: "u@x.com",
    fullName: "U",
    role: "ADMIN",
  });
  assert.equal(result.role, "ADMIN");
});

test("sanitizeUser handles explicit null for phone / jobTitle", () => {
  const result = sanitizeUser({
    id: "u",
    email: "u@x.com",
    fullName: "U",
    phone: null,
    jobTitle: null,
  });
  assert.equal(result.phone, null);
  assert.equal(result.jobTitle, null);
});
