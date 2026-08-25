import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";
import { env } from "@/core/config/env";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
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
 * POST /api/users/me/avatar
 *
 * Multipart upload of the current user's avatar image. Replaces the
 * existing avatar in S3 and updates `User.avatarUrl`. Auth required.
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
        {
          success: false,
          message: `File too large. Max: 5MB`,
        },
        { status: 400 }
      );
    }

    const ext = file.type.split("/")[1];
    const filename = `avatars/${user.id}-${Date.now()}.${ext}`;
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
    const avatarUrl = `https://${bucket}.s3.${env.AWS_REGION || "ap-south-1"}.amazonaws.com/media/${filename}`;

    // Best-effort delete of the previous avatar
    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarUrl: true },
    });
    if (existing?.avatarUrl) {
      try {
        const oldKey = existing.avatarUrl.split(
          `${bucket}.s3.${env.AWS_REGION || "ap-south-1"}.amazonaws.com/`
        )[1];
        if (oldKey) {
          await getS3Client().send(
            new DeleteObjectCommand({ Bucket: bucket, Key: oldKey })
          );
        }
      } catch (err) {
        logger.warn({ err }, "Failed to delete previous avatar");
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json(
      { success: true, message: "Avatar updated", data: { user: updated } },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Avatar upload failed");
    return NextResponse.json(
      { success: false, message: error.message || "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/me/avatar
 *
 * Removes the user's avatar (deletes from S3 and nulls the column).
 */
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const bucket = env.AWS_S3_BUCKET_NAME || "prana-earth-data";
    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarUrl: true },
    });
    if (existing?.avatarUrl) {
      try {
        const oldKey = existing.avatarUrl.split(
          `${bucket}.s3.${env.AWS_REGION || "ap-south-1"}.amazonaws.com/`
        )[1];
        if (oldKey) {
          await getS3Client().send(
            new DeleteObjectCommand({ Bucket: bucket, Key: oldKey })
          );
        }
      } catch (err) {
        logger.warn({ err }, "Failed to delete S3 avatar object");
      }
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });
    return NextResponse.json(
      { success: true, message: "Avatar removed" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete avatar" },
      { status: 500 }
    );
  }
}
