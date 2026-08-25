import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/core/database/prisma";
import { contactService } from "./contact.service";
import * as emailModule from "@/modules/shared/auth/email.service";

const UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

const SAMPLE_SUBMISSION = {
  id: UUID,
  userId: null,
  fullName: "Aadhar Goel",
  email: "aadhar@example.com",
  phone: "+91-9876543210",
  company: "Acme Corp",
  role: "Sustainability Manager",
  subject: "Looking for a climate risk assessment",
  message: "We need help with our portfolio.",
  status: "UNREAD",
  source: "marketplace-contact",
  metadata: null,
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  updatedAt: new Date("2026-08-01T10:00:00.000Z"),
};

interface FindCall {
  where: any;
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
  prisma.contactSubmission.findUnique = async (args: any) => {
    findCalls.push({ where: args?.where });
    return SAMPLE_SUBMISSION;
  };
  // @ts-expect-error
  prisma.contactSubmission.update = async (args: any) => {
    updateCalls.push({ where: args?.where, data: args?.data });
    return { ...SAMPLE_SUBMISSION, ...args?.data };
  };

  const original = (emailModule as any).emailService.sendContactReplyEmail;
  (emailModule as any).emailService.sendContactReplyEmail = async (
    email: string,
    fullName: string,
    body: string,
  ) => {
    emailCalls.push({ email, fullName, body });
  };

  t.after(() => {
    (emailModule as any).emailService.sendContactReplyEmail = original;
  });
  return { findCalls, updateCalls, emailCalls };
}

test("replyToSubmission sends email + flips status to REPLIED", async (t) => {
  const { findCalls, updateCalls, emailCalls } = installMocks(t);

  const result = await contactService.replyToSubmission({
    submissionId: UUID,
    replyMessage: "Thanks for reaching out, we are reviewing your inquiry.",
  });

  // Email is dispatched with the right recipient.
  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].email, "aadhar@example.com");
  assert.equal(emailCalls[0].fullName, "Aadhar Goel");
  assert.match(
    emailCalls[0].body,
    /Thanks for reaching out, we are reviewing your inquiry\./,
  );

  // DB update writes REPLIED.
  assert.equal(updateCalls.length, 1);
  assert.deepEqual(updateCalls[0].where, { id: UUID });
  assert.equal(updateCalls[0].data.status, "REPLIED");

  // The service returns the original (pre-update) row.
  assert.equal(result.id, UUID);
  assert.equal(result.status, "UNREAD");

  // findUnique was called with the right id.
  assert.equal(findCalls.length, 1);
  assert.deepEqual(findCalls[0].where, { id: UUID });
});

test("replyToSubmission rejects a replyMessage shorter than 5 chars", async (t) => {
  installMocks(t);
  await assert.rejects(
    () =>
      contactService.replyToSubmission({
        submissionId: UUID,
        replyMessage: "hi",
      }),
    /Please write a longer reply/,
  );
});

test("replyToSubmission throws when the submission does not exist", async (t) => {
  installMocks(t);
  // @ts-expect-error
  prisma.contactSubmission.findUnique = async () => null;
  await assert.rejects(
    () =>
      contactService.replyToSubmission({
        // Valid UUID so the schema accepts; findUnique returns null,
        // triggering the "not found" branch.
        submissionId: "f47ac10b-58cc-4372-a567-0e02b2c3d4a0",
        replyMessage: "Reply body that is long enough.",
      }),
    /Submission not found/,
  );
});

test("replyToSubmission propagates errors from the email service", async (t) => {
  installMocks(t);
  (emailModule as any).emailService.sendContactReplyEmail = async () => {
    throw new Error("SES bounced");
  };
  await assert.rejects(
    () =>
      contactService.replyToSubmission({
        submissionId: UUID,
        replyMessage: "Reply body that is long enough.",
      }),
    /SES bounced/,
  );
});

test("replyToSubmission accepts a replyMessage of exactly 5 chars (boundary)", async (t) => {
  const { emailCalls, updateCalls } = installMocks(t);
  await contactService.replyToSubmission({
    submissionId: UUID,
    replyMessage: "hello", // 5 chars
  });
  // The service returns the pre-update row, so we check that the
  // DB update was issued with the right status instead.
  assert.equal(emailCalls.length, 1);
  assert.equal(updateCalls[0].data.status, "REPLIED");
});

test("replyToSubmission rejects when submissionId is missing", async (t) => {
  installMocks(t);
  await assert.rejects(
    () =>
      contactService.replyToSubmission({
        submissionId: "",
        replyMessage: "Reply body that is long enough.",
      }),
    /Submission is required/,
  );
});
