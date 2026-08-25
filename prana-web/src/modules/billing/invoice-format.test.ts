import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAttachmentHeader,
  formatAmount,
  formatDateUtc,
  formatInvoiceNumber,
  formatInvoiceText,
} from "./invoice-format";

/**
 * Pure-function tests for the invoice text formatter that backs
 * `GET /api/billing/invoices/[id]/download?format=text`.
 *
 * Route-level integration is covered by curl smoke tests; this file
 * locks in the textual contract the browser sees on download.
 */

const PAYMENT_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d4a0";

const SAMPLE = {
  paymentId: PAYMENT_ID,
  paidAt: new Date("2026-08-01T10:00:00.000Z"),
  createdAt: new Date("2026-08-01T09:59:30.000Z"),
  amount: 1500.5, // number form
  currency: "INR",
  paymentProvider: "Razorpay",
  providerPaymentId: "pay_RZP_12345",
  subscription: {
    plan: { name: "Premium Marketplace", type: "MARKETPLACE" as const },
  },
  user: {
    id: "u-1",
    fullName: "Aadhar Goel",
    email: "aadhar@example.com",
  },
};

// ---------------------------------------------------------------------------
// formatInvoiceNumber
// ---------------------------------------------------------------------------

test("formatInvoiceNumber shortens the UUID prefix to 8 uppercase chars", () => {
  assert.equal(formatInvoiceNumber(PAYMENT_ID), `INV-${PAYMENT_ID.slice(0, 8).toUpperCase()}`);
});

// ---------------------------------------------------------------------------
// formatDateUtc
// ---------------------------------------------------------------------------

test("formatDateUtc renders an ISO string as a UTC string", () => {
  const iso = "2026-08-01T10:00:00.000Z";
  const out = formatDateUtc(iso);
  assert.match(out, /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
});

test("formatDateUtc accepts Date objects too", () => {
  assert.match(
    formatDateUtc(new Date("2026-08-01T10:00:00.000Z")),
    /GMT$/,
  );
});

test("formatDateUtc returns '—' for null / undefined / invalid input", () => {
  assert.equal(formatDateUtc(null), "—");
  assert.equal(formatDateUtc(undefined), "—");
  assert.equal(formatDateUtc("not-a-date"), "—");
});

// ---------------------------------------------------------------------------
// formatAmount
// ---------------------------------------------------------------------------

test("formatAmount accepts numbers", () => {
  assert.equal(formatAmount(1500.5), 1500.5);
  assert.equal(formatAmount(0), 0);
});

test("formatAmount accepts Prisma-Decimal-like objects via toString()", () => {
  const decimalLike = { toString: () => "123.45" };
  assert.equal(formatAmount(decimalLike), 123.45);
});

test("formatAmount returns 0 for null / undefined / unparseable values", () => {
  assert.equal(formatAmount(null), 0);
  assert.equal(formatAmount(undefined), 0);
  assert.equal(formatAmount(""), 0);
  assert.equal(formatAmount("not-a-number"), 0);
});

// ---------------------------------------------------------------------------
// formatInvoiceText
// ---------------------------------------------------------------------------

test("formatInvoiceText renders a full plain-text invoice", () => {
  const body = formatInvoiceText(SAMPLE);

  // Header
  assert.match(body, /PRANA EARTH — INVOICE/);
  // Number
  assert.match(body, new RegExp(`Invoice #:\\s+INV-${PAYMENT_ID.slice(0, 8).toUpperCase()}`));
  // Issued as a UTC string, not a raw ISO
  assert.match(body, /\d{2}:\d{2}:\d{2} GMT/);
  // Status
  assert.match(body, /Status:\s+PAID/);
  // Bill-to
  assert.match(body, /Bill to:/);
  assert.match(body, /Aadhar Goel/);
  assert.match(body, /aadhar@example\.com/);
  // Item + plan type annotation
  assert.match(body, /Premium Marketplace \(MARKETPLACE\)/);
  // Amount formatted to 2dp
  assert.match(body, /INR 1500\.50/);
  assert.match(body, /Razorpay/);
  assert.match(body, /pay_RZP_12345/);
  assert.match(body, /Internal ref:\s+f47ac10b-58cc-4372-a567-0e02b2c3d4a0/);
  // Body ends with a trailing newline so the response stream
  // terminates cleanly.
  assert.ok(body.endsWith("\n"), "invoice body must end with a newline");
});

test("formatInvoiceText falls back to safe defaults when fields are missing", () => {
  const minimal = {
    paymentId: PAYMENT_ID,
    createdAt: new Date("2026-08-01T09:59:30.000Z"),
    amount: null,
    currency: null,
    user: { fullName: null, email: null },
    subscription: { plan: { name: null, type: null } },
    paymentProvider: null,
    providerPaymentId: null,
  };
  const body = formatInvoiceText(minimal);
  assert.match(body, /INR 0\.00/);
  // em-dash appears for every missing field — no word-boundary
  // anchor needed since `—` is itself a non-word punctuation char.
  assert.ok(body.includes("—"));
  assert.ok(body.includes("Subscription")); // default plan name
  assert.ok(body.includes("unknown")); // default provider
});

test("formatInvoiceText uses paidAt when present, else createdAt", () => {
  const a = formatInvoiceText({ ...SAMPLE, paidAt: new Date("2026-05-01T00:00:00.000Z") });
  const b = formatInvoiceText({ ...SAMPLE, paidAt: null });
  // a includes May 2026, b includes August (the createdAt fallback)
  assert.match(a, /May/);
  assert.match(b, /Aug/);
});

// ---------------------------------------------------------------------------
// buildAttachmentHeader
// ---------------------------------------------------------------------------

test("buildAttachmentHeader produces a valid Content-Disposition value", () => {
  const header = buildAttachmentHeader(PAYMENT_ID);
  assert.match(header, /^attachment;/);
  assert.match(header, /filename="INV-[A-F0-9]{8}\.txt"/);
  // Exactly one quoted filename parameter
  const matches = header.match(/filename="[^"]+"/g);
  assert.ok(matches && matches.length === 1);
});
