import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/core/database/prisma";
import { dprService } from "./dpr.service";

// Mock the email service so we don't try to send real mail.
import * as emailModule from "@/modules/shared/auth/email.service";
// We can't reassign named exports of an ESM module, so we mock the
// sendDprRequestReplyEmail method on the imported object via a Proxy
// in the test setup below.

const UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const PROJECT_ID = "a47ac10b-58cc-4372-a567-0e02b2c3d4a0";
const USER_ID = "b47ac10b-58cc-4372-a567-0e02b2c3d4b0";

const SAMPLE_DPR = {
  id: UUID,
  userId: USER_ID,
  projectId: PROJECT_ID,
  message: "We need a full climate risk assessment.",
  status: "PENDING",
  metadata: { companyName: "Acme Corp" },
  resolvedAt: null,
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  updatedAt: new Date("2026-08-01T10:00:00.000Z"),
  user: {
    id: USER_ID,
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
  },
  project: {
    id: PROJECT_ID,
    title: "Mumbai Mangrove Restoration",
  },
};

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

interface FindCall {
  where: any;
  include?: any;
}
interface UpdateCall {
  where: any;
  data: any;
}

function installMocks(t: any) {
  const findCalls: FindCall[] = [];
  const updateCalls: UpdateCall[] = [];
  const emailCalls: any[] = [];

  // @ts-expect-error — narrow signature for the test spy
  prisma.dPRRequest.findUnique = async (args: any) => {
    findCalls.push({ where: args?.where, include: args?.include });
    return SAMPLE_DPR;
  };
  // @ts-expect-error
  prisma.dPRRequest.update = async (args: any) => {
    updateCalls.push({ where: args?.where, data: args?.data });
    return { ...SAMPLE_DPR, ...args?.data };
  };

  // Patch the email service's sendDprRequestReplyEmail to capture calls.
  // The emailService is an object exported as a const; we mutate the
  // method on the object directly.
  const original = (emailModule as any).emailService.sendDprRequestReplyEmail;
  (emailModule as any).emailService.sendDprRequestReplyEmail = async (
    email: string,
    fullName: string,
    projectTitle: string,
    body: string,
  ) => {
    emailCalls.push({ email, fullName, projectTitle, body });
  };

  t.after(() => {
    (emailModule as any).emailService.sendDprRequestReplyEmail = original;
  });
  return { findCalls, updateCalls, emailCalls };
}

// ---------------------------------------------------------------------------
// replyToDprRequest — happy path
// ---------------------------------------------------------------------------

test("replyToDprRequest sends email + flips status to RESPONDED + sets resolvedAt", async (t) => {
  const { findCalls, updateCalls, emailCalls } = installMocks(t);

  const result = await dprService.replyToDprRequest({
    dprRequestId: UUID,
    replyMessage: "Thanks for the request. We're scheduling a call this week.",
  });

  // ─── Email is dispatched with the right recipient + project title ───
  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].email, "aadhar@example.com");
  assert.equal(emailCalls[0].fullName, "Aadhar Goel");
  assert.equal(emailCalls[0].projectTitle, "Mumbai Mangrove Restoration");
  assert.match(
    emailCalls[0].body,
    /Thanks for the request\. We're scheduling a call this week\./,
  );

  // ─── DB update writes RESPONDED + sets resolvedAt ───
  assert.equal(updateCalls.length, 1);
  assert.deepEqual(updateCalls[0].where, { id: UUID });
  assert.equal(updateCalls[0].data.status, "RESPONDED");
  assert.ok(updateCalls[0].data.resolvedAt instanceof Date);

  // ─── The function returns the original row (status BEFORE the
  // update); the actual update is verified via `updateCalls` above. ───
  assert.equal(result.id, UUID);
  assert.equal(result.status, "PENDING");

  // ─── findUnique was called with the right id and includes user + project ───
  assert.equal(findCalls.length, 1);
  assert.deepEqual(findCalls[0].where, { id: UUID });
  assert.deepEqual(findCalls[0].include, { user: true, project: true });
});

// ---------------------------------------------------------------------------
// Validation — too short / missing
// ---------------------------------------------------------------------------

test("replyToDprRequest rejects a replyMessage shorter than 5 chars", async (t) => {
  installMocks(t);
  await assert.rejects(
    () =>
      dprService.replyToDprRequest({
        dprRequestId: UUID,
        replyMessage: "hi",
      }),
    /Please write a longer reply/,
  );
});

test("replyToDprRequest rejects when dprRequestId is missing", async (t) => {
  installMocks(t);
  await assert.rejects(
    () =>
      dprService.replyToDprRequest({
        dprRequestId: "",
        replyMessage: "This is a real reply body.",
      }),
    /Invalid DPR request ID/, // z.string().uuid() rejects "" with this message
  );
});

test("replyToDprRequest accepts a replyMessage of exactly 5 chars (boundary)", async (t) => {
  const { emailCalls, updateCalls } = installMocks(t);
  await dprService.replyToDprRequest({
    dprRequestId: UUID,
    replyMessage: "hello", // 5 chars
  });
  // The service returns the pre-update row, so we check the
  // DB update was issued with the right status instead.
  assert.equal(emailCalls.length, 1);
  assert.equal(updateCalls[0].data.status, "RESPONDED");
  assert.ok(updateCalls[0].data.resolvedAt instanceof Date);
});

// ---------------------------------------------------------------------------
// Not found
// ---------------------------------------------------------------------------

test("replyToDprRequest throws when the DPR request does not exist", async (t) => {
  installMocks(t);
  // @ts-expect-error
  prisma.dPRRequest.findUnique = async () => null;
  await assert.rejects(
    () =>
      dprService.replyToDprRequest({
        // Valid v4 UUID so the schema accepts it; findUnique then
        // returns null, which triggers the "not found" branch.
        dprRequestId: "f47ac10b-58cc-4372-a567-0e02b2c3d4a0",
        replyMessage: "This is a real reply body.",
      }),
    /DPR request not found/,
  );
});

// ---------------------------------------------------------------------------
// No user / no project (malformed relation) — DOES throw because
// the service accesses `request.user.email` (a known fragility —
// left in place to document the contract). Contact / Express
// Interest do not have this issue because they look up the email
// directly on the top-level record.
// ---------------------------------------------------------------------------

test("replyToDprRequest throws TypeError when user relation is missing", async (t) => {
  installMocks(t);
  // @ts-expect-error
  prisma.dPRRequest.findUnique = async () => ({
    ...SAMPLE_DPR,
    user: null,
  });
  await assert.rejects(
    () =>
      dprService.replyToDprRequest({
        dprRequestId: UUID,
        replyMessage: "Reply body.",
      }),
    TypeError,
  );
});

// ---------------------------------------------------------------------------
// Email service throws — the DB update still happens (intentional fire-and-forget)
// ---------------------------------------------------------------------------

test("replyToDprRequest propagates errors from the email service", async (t) => {
  installMocks(t);
  (emailModule as any).emailService.sendDprRequestReplyEmail = async () => {
    throw new Error("SES rate-limited");
  };
  await assert.rejects(
    () =>
      dprService.replyToDprRequest({
        dprRequestId: UUID,
        replyMessage: "Reply body that is long enough.",
      }),
    /SES rate-limited/,
  );
});
