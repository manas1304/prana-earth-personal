import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/core/database/prisma";
import { authService } from "./auth.service";

/**
 * Tests that the new RegisterSchema fields are persisted by
 * `authService.register`. The frontend (predict login page) sends
 * extra fields on top of fullName/email/password. The audit found
 * these were silently dropped before; the fix now persists them.
 *
 * - `phone`, `jobTitle`, `countryRegion` -> User columns directly
 * - `company`, `agreed`, `agreedAt`     -> User.metadata JSON
 *
 * These tests stub the prisma client.
 */

const SAMPLE_USER = {
  id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  email: "aadhar@example.com",
  fullName: "Aadhar Goel",
  passwordHash: "$2a$12$abcdefghijklmnopqrstuvwxyz1234567890",
  phone: null,
  jobTitle: null,
  countryRegion: null,
  timezone: null,
  avatarUrl: null,
  isEmailVerified: false,
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// -----------------------------------------------------------------------

test("register persists phone, jobTitle, countryRegion from RegisterSchema", async (t) => {
  // Stub the "user does not exist" lookup.
  const originalFind = prisma.user.findUnique;
  const originalTx = prisma.$transaction;
  let createArgs: any = null;

  // @ts-expect-error
  prisma.user.findUnique = async () => null;
  // @ts-expect-error
  prisma.$transaction = async (fn: any) =>
    fn({
      user: {
        create: async (args: any) => {
          createArgs = args;
          return { ...SAMPLE_USER, ...args.data };
        },
      },
      emailVerificationToken: {
        create: async () => ({}),
      },
    });

  t.after(() => {
    prisma.user.findUnique = originalFind;
    prisma.$transaction = originalTx;
  });

  await authService.register({
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    password: "Pa55word!",
    confirmPassword: "Pa55word!",
    phone: "+91-9876543210",
    jobTitle: "Sustainability Manager",
    country: "India",
  });

  assert.ok(createArgs, "user.create was not called");
  assert.equal(createArgs.data.phone, "+91-9876543210");
  assert.equal(createArgs.data.jobTitle, "Sustainability Manager");
  // 'country' on the schema maps to countryRegion on the User model.
  assert.equal(createArgs.data.countryRegion, "India");
});

test("register stores company + agreed + agreedAt inside User.metadata", async (t) => {
  const originalFind = prisma.user.findUnique;
  const originalTx = prisma.$transaction;
  let createArgs: any = null;

  // @ts-expect-error
  prisma.user.findUnique = async () => null;
  // @ts-expect-error
  prisma.$transaction = async (fn: any) =>
    fn({
      user: {
        create: async (args: any) => {
          createArgs = args;
          return SAMPLE_USER;
        },
      },
      emailVerificationToken: {
        create: async () => ({}),
      },
    });

  t.after(() => {
    prisma.user.findUnique = originalFind;
    prisma.$transaction = originalTx;
  });

  await authService.register({
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    password: "Pa55word!",
    confirmPassword: "Pa55word!",
    company: "Greentech Solutions",
    agreed: true,
  });

  assert.ok(createArgs, "user.create was not called");
  const metadata = createArgs.data.metadata;
  assert.ok(metadata, "metadata was not set");
  assert.equal(metadata.company, "Greentech Solutions");
  assert.equal(metadata.agreed, true);
  assert.ok(
    metadata.agreedAt,
    "agreedAt timestamp should be set when agreed=true",
  );
});

test("register leaves metadata as { agreed: false, agreedAt: null, company: null } when not provided", async (t) => {
  const originalFind = prisma.user.findUnique;
  const originalTx = prisma.$transaction;
  let createArgs: any = null;

  // @ts-expect-error
  prisma.user.findUnique = async () => null;
  // @ts-expect-error
  prisma.$transaction = async (fn: any) =>
    fn({
      user: {
        create: async (args: any) => {
          createArgs = args;
          return SAMPLE_USER;
        },
      },
      emailVerificationToken: {
        create: async () => ({}),
      },
    });

  t.after(() => {
    prisma.user.findUnique = originalFind;
    prisma.$transaction = originalTx;
  });

  await authService.register({
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
    password: "Pa55word!",
    confirmPassword: "Pa55word!",
  });

  assert.equal(createArgs.data.metadata.company, null);
  assert.equal(createArgs.data.metadata.agreed, false);
  assert.equal(createArgs.data.metadata.agreedAt, null);
  // The DB columns stay null when omitted.
  assert.equal(createArgs.data.phone, null);
  assert.equal(createArgs.data.jobTitle, null);
  assert.equal(createArgs.data.countryRegion, null);
});

test("register still throws ConflictError when email already exists", async (t) => {
  const originalFind = prisma.user.findUnique;
  // @ts-expect-error
  prisma.user.findUnique = async () => SAMPLE_USER;
  t.after(() => {
    prisma.user.findUnique = originalFind;
  });
  await assert.rejects(
    () =>
      authService.register({
        fullName: "Aadhar Goel",
        email: "aadhar@example.com",
        password: "Pa55word!",
        confirmPassword: "Pa55word!",
      }),
    /Email already registered/,
  );
});

test("register still throws on a weak password", async () => {
  await assert.rejects(
    () =>
      authService.register({
        fullName: "Aadhar Goel",
        email: "aadhar@example.com",
        password: "weak",
        confirmPassword: "weak",
      }),
    /at least 8 characters/,
  );
});
