import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeUser } from "./user";

test("sanitizeUser preserves profile fields like jobTitle and countryRegion", () => {
  const result = sanitizeUser({
    id: "user-1",
    email: "user@example.com",
    fullName: "Jane Doe",
    jobTitle: "Product Manager",
    countryRegion: "India",
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    phone: "+91-9876543210",
  });

  assert.equal(result.jobTitle, "Product Manager");
  assert.equal(result.countryRegion, "India");
  assert.equal(result.timezone, "Asia/Kolkata");
  assert.equal(result.locale, "en-IN");
});
