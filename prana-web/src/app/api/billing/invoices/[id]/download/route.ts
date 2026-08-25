import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";
import {
  buildAttachmentHeader,
  formatInvoiceText,
} from "@/modules/billing/invoice-format";

/**
 * GET /api/billing/invoices/[id]/download?format=text|pdf|json
 *
 * Streams a downloadable invoice for the current user's payment.
 *
 *   format=text   (default) — plain-text invoice, `Content-Disposition:
 *                  attachment; filename=INV-XXXX.txt`. The browser
 *                  downloads it directly; no client-side Blob wrapper
 *                  needed. Use `<a download href={url}>` or
 *                  `window.open(url)`.
 *   format=json   — JSON envelope (no download). Useful for callers
 *                  that want to render the invoice programmatically.
 *   format=pdf    — JSON envelope referencing `text` (placeholder;
 *                  wire `pdfkit` for actual PDF generation).
 *
 * Auth: cookie required, scoped to `Payment.userId === user.id`.
 *
 * Example URL the frontend should hit for the "Download" button:
 *   GET /api/billing/invoices/{paymentId}/download
 *
 * The `GET /api/billing/invoices` list endpoint returns `invoiceUrl:
 * /api/billing/invoices/{id}/download` for every row — the frontend
 * can drop that URL straight into an `<a download href={invoiceUrl}>`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 },
      );
    }
    const { id } = await params;
    const format = (
      req.nextUrl.searchParams.get("format") ?? "text"
    ).toLowerCase();

    const payment = await prisma.payment.findFirst({
      where: { id, userId: user.id },
      include: {
        subscription: {
          include: { plan: { select: { name: true, type: true } } },
        },
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
    if (!payment) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 },
      );
    }
    if (payment.status !== "SUCCESS") {
      return NextResponse.json(
        { success: false, message: "Invoice is not available" },
        { status: 409 },
      );
    }

    const number = `INV-${payment.id.slice(0, 8).toUpperCase()}`;

    // -- format=json / format=pdf (placeholder)
    if (format === "json" || format === "pdf") {
      const envelope: Record<string, unknown> = {
        success: true,
        data: {
          invoiceId: payment.id,
          number,
          amount: payment.amount ? Number(payment.amount) : 0,
          currency: payment.currency ?? "INR",
          issuedAt: payment.paidAt ?? payment.createdAt,
          plan: payment.subscription?.plan,
          user: payment.user,
          provider: payment.paymentProvider,
          providerPaymentId: payment.providerPaymentId,
        },
      };
      if (format === "pdf") {
        // Placeholder for a real PDF generator. Until pdfkit is wired,
        // the JSON points the client at the text download.
        envelope.data = {
          ...(envelope.data as Record<string, any>),
          downloadUrl: `/api/billing/invoices/${payment.id}/download?format=text`,
          note: "PDF generation not yet wired — falling back to plain-text.",
        };
      }
      return NextResponse.json(envelope, { status: 200 });
    }

    // -- format=text (default) — stream a plain-text invoice directly
    // via the shared formatter helper. The browser downloads it as
    // `INV-XXXXXXXX.txt` based on Content-Disposition: attachment.
    const body = formatInvoiceText({
      paymentId: payment.id,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      amount: payment.amount,
      currency: payment.currency,
      paymentProvider: payment.paymentProvider,
      providerPaymentId: payment.providerPaymentId,
      subscription: payment.subscription,
      user: payment.user,
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": buildAttachmentHeader(payment.id),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to download invoice");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
