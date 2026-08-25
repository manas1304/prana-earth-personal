import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";
import { env } from "@/core/config/env";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "html"; // html | pdf

    // Load the payment with related user/subscription
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: id },
          { providerPaymentId: id },
        ],
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
      );
    }

    // Get the subscription plan info if available
    const subscription = await prisma.subscription.findUnique({
      where: { id: payment.subscriptionId },
      include: {
        plan: { select: { name: true, type: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Build invoice data
    const invoiceNumber = `INV-${payment.id.slice(0, 8).toUpperCase()}-${(payment.createdAt.getFullYear())}`;
    const invoiceDate = payment.createdAt.toISOString().split("T")[0];
    const dueDate = invoiceDate;
    const amount = payment.amount ? Number(payment.amount) : 0;
    const taxRate = 0.18; // 18% GST (India)
    const subtotal = amount / (1 + taxRate);
    const tax = amount - subtotal;

    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: {
          invoice: {
            number: invoiceNumber,
            date: invoiceDate,
            dueDate,
            status: payment.status,
            paymentProvider: payment.paymentProvider,
            providerPaymentId: payment.providerPaymentId,
            paidAt: payment.paidAt,
          },
          billTo: {
            name: payment.user?.fullName || "Customer",
            email: payment.user?.email,
            userId: payment.userId,
          },
          subscription: subscription
            ? {
                id: subscription.id,
                plan: subscription.plan?.name,
                type: subscription.plan?.type,
              }
            : null,
          lineItems: [
            {
              description: subscription?.plan?.name || "Subscription",
              quantity: 1,
              unitPrice: subtotal,
              amount: subtotal,
            },
          ],
          subtotal: Number(subtotal.toFixed(2)),
          tax: Number(tax.toFixed(2)),
          taxRate: taxRate * 100,
          total: amount,
          currency: payment.currency || "INR",
        },
      });
    }

    // HTML invoice
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Invoice ${invoiceNumber}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 32px auto; padding: 24px; color: #111; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 32px; }
  .brand { font-size: 24px; font-weight: 700; color: #16a34a; }
  .brand-tag { font-size: 12px; color: #666; margin-top: 4px; }
  .meta { text-align: right; font-size: 13px; }
  .meta div { margin: 2px 0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
  .label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
  .value { font-size: 14px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #f5f5f4; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 12px; border-bottom: 1px solid #e7e5e4; font-size: 14px; }
  .right { text-align: right; }
  .totals { margin-top: 20px; padding: 16px; background: #f5f5f4; border-radius: 8px; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { font-size: 20px; font-weight: 700; color: #16a34a; padding-top: 8px; border-top: 1px solid #d6d3d1; margin-top: 8px; }
  .status { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .status-success { background: #dcfce7; color: #166534; }
  .status-failed { background: #fee2e2; color: #991b1b; }
  .status-pending { background: #fef3c7; color: #92400e; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e7e5e4; text-align: center; font-size: 11px; color: #888; }
  @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="no-print" style="text-align: right; margin-bottom: 20px;">
    <button onclick="window.print()" style="background: #16a34a; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px;">🖨️ Print / Save as PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="brand">Prana Earth</div>
      <div class="brand-tag">Climate Intelligence Platform</div>
    </div>
    <div class="meta">
      <div style="font-size: 20px; font-weight: 700;">INVOICE</div>
      <div><strong>${invoiceNumber}</strong></div>
      <div class="label">Date</div>
      <div>${invoiceDate}</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="label">Bill To</div>
      <div class="value"><strong>${payment.user?.fullName || "Customer"}</strong></div>
      <div>${payment.user?.email || ""}</div>
      ${payment.userId ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">User ID: ${payment.userId}</div>` : ""}
    </div>
    <div>
      <div class="label">Payment Details</div>
      <div class="value">
        <span class="status status-${(payment.status || "pending").toLowerCase()}">${payment.status || "PENDING"}</span>
      </div>
      <div style="margin-top: 8px; font-size: 12px;">
        ${payment.paymentProvider ? `<div>Provider: <strong>${payment.paymentProvider}</strong></div>` : ""}
        ${payment.providerPaymentId ? `<div>Txn ID: <code>${payment.providerPaymentId}</code></div>` : ""}
        ${payment.paidAt ? `<div>Paid At: ${payment.paidAt.toISOString()}</div>` : ""}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="right" style="width: 80px;">Qty</th>
        <th class="right" style="width: 120px;">Unit Price</th>
        <th class="right" style="width: 120px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${subscription?.plan?.name || "Subscription"} <br/><span style="color: #888; font-size: 11px;">${subscription?.plan?.type || ""}</span></td>
        <td class="right">1</td>
        <td class="right">${(payment.currency || "INR")} ${subtotal.toFixed(2)}</td>
        <td class="right">${(payment.currency || "INR")} ${subtotal.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals" style="margin-left: 50%; max-width: 350px;">
    <div class="row">
      <span>Subtotal</span>
      <span>${(payment.currency || "INR")} ${subtotal.toFixed(2)}</span>
    </div>
    <div class="row">
      <span>Tax (18% GST)</span>
      <span>${(payment.currency || "INR")} ${tax.toFixed(2)}</span>
    </div>
    <div class="row grand">
      <span>Total Paid</span>
      <span>${(payment.currency || "INR")} ${amount.toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    Thank you for your business. For questions, contact <strong>support@prana.earth</strong>.
    <br/>
    Invoice generated by Prana Earth Platform • ${env.NEXT_PUBLIC_APP_URL}
  </div>
</body>
</html>`;

    if (format === "pdf") {
      // For true PDF, use the user's browser print dialog ("Save as PDF")
      // The browser's Ctrl+P → Save as PDF is the most reliable cross-platform approach.
      // We return HTML with print styles.
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${invoiceNumber}.html"`,
        },
      });
    }

    // Default: HTML for browser view/print
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${invoiceNumber}.html"`,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Invoice generation failed");
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to generate invoice",
      },
      { status: 500 }
    );
  }
}
