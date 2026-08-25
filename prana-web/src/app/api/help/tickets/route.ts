import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/core/config/env";

let s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const JsonTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(255),
  description: z.string().min(1, "Description is required").max(8000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

/**
 * POST /api/help/tickets
 *
 * Create a new support ticket. Two flavours:
 *
 *   1) `application/json`
 *      Body: `{ subject, description, priority? }`
 *
 *   2) `multipart/form-data`
 *      Fields: `subject`, `description`, `priority?`, `attachments[]`
 *      (any number of `file` parts, up to 10 MB each)
 *
 * Auth optional — if a user is signed in, the ticket is linked to them.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const contentType = req.headers.get("content-type") ?? "";

    let subject: string;
    let description: string;
    let priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "MEDIUM";
    let attachments: any = undefined;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const parsed = JsonTicketSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid payload",
            errors: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }
      subject = parsed.data.subject;
      description = parsed.data.description;
      priority = parsed.data.priority;
    } else if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const formData = await req.formData();
      const subjectRaw = formData.get("subject");
      const descriptionRaw = formData.get("description");
      const priorityRaw = formData.get("priority");
      if (typeof subjectRaw !== "string" || typeof descriptionRaw !== "string") {
        return NextResponse.json(
          { success: false, message: "subject and description are required" },
          { status: 400 }
        );
      }
      const parsed = JsonTicketSchema.safeParse({
        subject: subjectRaw,
        description: descriptionRaw,
        priority:
          typeof priorityRaw === "string" && priorityRaw.length > 0
            ? priorityRaw
            : "MEDIUM",
      });
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid payload",
            errors: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }
      subject = parsed.data.subject;
      description = parsed.data.description;
      priority = parsed.data.priority;

      // Upload attachments to S3
      const files = formData.getAll("attachments").filter((v): v is File => v instanceof File);
      const bucket = env.AWS_S3_BUCKET_NAME || "prana-earth-data";
      const attachmentMetas: any[] = [];
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { success: false, message: `File too large: ${file.name}` },
            { status: 400 }
          );
        }
        const ext = file.name.split(".").pop() ?? "bin";
        const key = `tickets/${user?.id ?? "anon"}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const buf = Buffer.from(await file.arrayBuffer());
        await getS3Client().send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `media/${key}`,
            Body: buf,
            ContentType: file.type,
            CacheControl: "private, max-age=3600",
          })
        );
        attachmentMetas.push({
          fileName: file.name,
          url: `https://${bucket}.s3.${env.AWS_REGION || "ap-south-1"}.amazonaws.com/media/${key}`,
          size: file.size,
          contentType: file.type,
        });
      }
      if (attachmentMetas.length > 0) attachments = attachmentMetas;
    } else {
      return NextResponse.json(
        { success: false, message: "Unsupported content type" },
        { status: 415 }
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user?.id,
        subject,
        description,
        priority,
        attachments,
      },
    });

    // TODO: send notification/email to support@pranaearth.com when wired.

    return NextResponse.json(
      { success: true, data: { ticket } },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to create support ticket");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/help/tickets
 *
 * List the caller's tickets. Auth required.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(
      { success: true, data: { tickets } },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
