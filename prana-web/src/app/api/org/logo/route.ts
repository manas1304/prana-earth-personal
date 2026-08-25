import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";
import { env } from "@/core/config/env";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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

/**
 * POST /api/org/logo
 *
 * Multipart upload of the current user's organization logo. Replaces
 * the existing S3 object and updates `Organization.logoUrl`. Caller
 * must be OWNER or ADMIN.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, organization: { deletedAt: null } },
    });
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "No organization" },
        { status: 404 }
      );
    }
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Only OWNER or ADMIN can upload the org logo" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "No file provided in 'file' field" },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "File too large. Max: 5MB" },
        { status: 400 }
      );
    }

    const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
    const filename = `org-logos/${membership.organizationId}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucket = env.AWS_S3_BUCKET_NAME || "prana-earth-data";
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `media/${filename}`,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=86400",
      })
    );
    const logoUrl = `https://${bucket}.s3.${env.AWS_REGION || "ap-south-1"}.amazonaws.com/media/${filename}`;

    // Best-effort delete of old logo
    const existing = await prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: { logoUrl: true },
    });
    if (existing?.logoUrl) {
      try {
        const oldKey = existing.logoUrl.split(
          `${bucket}.s3.${env.AWS_REGION || "ap-south-1"}.amazonaws.com/`
        )[1];
        if (oldKey) {
          await getS3Client().send(
            new DeleteObjectCommand({ Bucket: bucket, Key: oldKey })
          );
        }
      } catch (err) {
        logger.warn({ err }, "Failed to delete previous org logo");
      }
    }

    const updated = await prisma.organization.update({
      where: { id: membership.organizationId },
      data: { logoUrl },
      select: { id: true, name: true, logoUrl: true },
    });
    return NextResponse.json(
      { success: true, data: { organization: updated } },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Org logo upload failed");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, organization: { deletedAt: null } },
    });
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "No organization" },
        { status: 404 }
      );
    }
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    const bucket = env.AWS_S3_BUCKET_NAME || "prana-earth-data";
    const existing = await prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: { logoUrl: true },
    });
    if (existing?.logoUrl) {
      try {
        const oldKey = existing.logoUrl.split(
          `${bucket}.s3.${env.AWS_REGION || "ap-south-1"}.amazonaws.com/`
        )[1];
        if (oldKey) {
          await getS3Client().send(
            new DeleteObjectCommand({ Bucket: bucket, Key: oldKey })
          );
        }
      } catch (err) {
        logger.warn({ err }, "Failed to delete S3 org logo object");
      }
    }
    await prisma.organization.update({
      where: { id: membership.organizationId },
      data: { logoUrl: null },
    });
    return NextResponse.json(
      { success: true, message: "Logo removed" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
