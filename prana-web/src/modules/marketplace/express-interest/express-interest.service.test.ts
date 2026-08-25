import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/core/database/prisma";
import { expressInterestService } from "./express-interest.service";
import * as emailModule from "@/modules/shared/auth/email.service";

const UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const PROJECT_ID = "a47ac10b-58cc-4372-a567-0e02b2c3d4a0";
const USER_ID = "b47ac10b-58cc-4372-a567-0e02b2c3d4b0";

const SAMPLE_INTEREST = {
  id: UUID,
  userId: USER_ID,
  projectId: PROJECT_ID,
  message: "I would like to invest in this project.",
  investmentAmount: 50000,
  status: "NEW",
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

  // @ts-expect-error
  prisma.expressInterest.findUnique = async (args: any) => {
    findCalls.push({ where: args?.where, include: args?.include });
    return SAMPLE_INTEREST;
  };
  // @ts-expect-error
  prisma.expressInterest.update = async (args: any) => {
    updateCalls.push({ where: args?.where, data: args?.data });
    return { ...SAMPLE_INTEREST, ...args?.data };
  };

  const original = (emailModule as any).emailService
    .sendExpressInterestReplyEmail;
  (emailModule as any).emailService.sendExpressInterestReplyEmail = async (
    email: string,
    fullName: string,
    projectTitle: string,
    body: string,
  ) => {
    emailCalls.push({ email, fullName, projectTitle, body });
  };

  t.after(() => {
    (emailModule as any).emailService.sendExpressInterestReplyEmail = original;
  });
  return { findCalls, updateCalls, emailCalls };
}

test("replyToInterest sends email + flips status to CONTACTED", async (t) => {
  const { findCalls, updateCalls, emailCalls } = installMocks(t);

  const result = await expressInterestService.replyToInterest({
    interestId: UUID,
    replyMessage: "Thanks for the interest. Let's schedule a call this week.",
  });

  // Email is dispatched with the right recipient + project title.
  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].email, "aadhar@example.com");
  assert.equal(emailCalls[0].fullName, "Aadhar Goel");
  assert.equal(emailCalls[0].projectTitle, "Mumbai Mangrove Restoration");
  assert.match(
    emailCalls[0].body,
    /Thanks for the interest\. Let's schedule a call this week\./,
  );

  // DB update writes CONTACTED.
  assert.equal(updateCalls.length, 1);
  assert.deepEqual(updateCalls[0].where, { id: UUID });
  assert.equal(updateCalls[0].data.status, "CONTACTED");

  // The function returns the original row (status BEFORE the
  // update); the actual update is verified via `updateCalls` above.
  assert.equal(result.id, UUID);
  assert.equal(result.status, "NEW");

  // findUnique was called with the right id and includes user + project.
  assert.equal(findCalls.length, 1);
  assert.deepEqual(findCalls[0].where, { id: UUID });
  assert.deepEqual(findCalls[0].include, { user: true, project: true });
});

test("replyToInterest rejects a replyMessage shorter than 5 chars", async (t) => {
  installMocks(t);
  await assert.rejects(
    () =>
      expressInterestService.replyToInterest({
        interestId: UUID,
        replyMessage: "hi",
      }),
    /Please write a longer reply/,
  );
});

test("replyToInterest accepts the new optional status field", async (t) => {
  const { updateCalls, emailCalls } = installMocks(t);
  await expressInterestService.replyToInterest({
    interestId: UUID,
    replyMessage: "Forwarded to the program manager.",
    status: "IN_PROGRESS",
  });
  // Email still goes out.
  assert.equal(emailCalls.length, 1);
  // The status field on the row is still CONTACTED because the
  // service hard-codes that to mirror the original behaviour.
  assert.equal(updateCalls[0].data.status, "CONTACTED");
});

test("replyToInterest throws when the interest does not exist", async (t) => {
  installMocks(t);
  // @ts-expect-error
  prisma.expressInterest.findUnique = async () => null;
  await assert.rejects(
    () =>
      expressInterestService.replyToInterest({
        // Valid v4 UUID so the schema accepts it; findUnique then
        // returns null, which triggers the "not found" branch.
        interestId: "f47ac10b-58cc-4372-a567-0e02b2c3d4a0",
        replyMessage: "Reply body that is long enough.",
      }),
    /Express Interest request not found/,
  );
});

test("replyToInterest propagates errors from the email service", async (t) => {
  installMocks(t);
  (emailModule as any).emailService.sendExpressInterestReplyEmail =
    async () => {
      throw new Error("SES 5xx");
    };
  await assert.rejects(
    () =>
      expressInterestService.replyToInterest({
        interestId: UUID,
        replyMessage: "Reply body that is long enough.",
      }),
    /SES 5xx/,
  );
});

test("replyToInterest accepts a replyMessage of exactly 5 chars (boundary)", async (t) => {
  const { emailCalls, updateCalls } = installMocks(t);
  await expressInterestService.replyToInterest({
    interestId: UUID,
    replyMessage: "hello", // 5 chars
  });
  // The service returns the pre-update row, so we check the
  // DB update was issued with the right status instead.
  assert.equal(emailCalls.length, 1);
  assert.equal(updateCalls[0].data.status, "CONTACTED");
});
