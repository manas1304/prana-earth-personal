import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";
import { env } from "@/core/config/env";

// Allowed image MIME types
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth: admin only
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

    // Find the partner
    const partner = await prisma.implementationPartner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!partner) {
      return NextResponse.json(
        { success: false, message: "Implementation partner not found" },
        { status: 404 }
      );
    }

    // Parse multipart/form-data
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "No file provided in 'file' field" },
        { status: 400 }
      );
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB`,
        },
        { status: 400 }
      );
    }

    // Determine file extension
    const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
    const filename = `partners/${partner.partnerId}-${Date.now()}.${ext}`;

    // Upload to S3
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

    // Optionally delete the old logo
    if (partner.logoUrl) {
      try {
        const oldKey = partner.logoUrl.split(`${bucket}.s3.${env.AWS_REGION}.amazonaws.com/`)[1];
        if (oldKey) {
          await getS3Client().send(
            new DeleteObjectCommand({ Bucket: bucket, Key: oldKey })
          );
        }
      } catch (err) {
        logger.warn({ err }, "Failed to delete old partner logo");
      }
    }

    // Update partner record
    const updated = await prisma.implementationPartner.update({
      where: { id },
      data: { logoUrl },
    });

    logger.info(
      { partnerId: partner.partnerId, logoUrl, uploadedBy: currentUser.id },
      "Partner logo uploaded"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Logo uploaded successfully",
        data: { logoUrl, partner: updated },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Partner logo upload failed");
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to upload logo",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
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
    const partner = await prisma.implementationPartner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!partner) {
      return NextResponse.json(
        { success: false, message: "Implementation partner not found" },
        { status: 404 }
      );
    }

    if (partner.logoUrl) {
      const bucket = env.AWS_S3_BUCKET_NAME || "prana-earth-data";
      const oldKey = partner.logoUrl.split(`${bucket}.s3.${env.AWS_REGION}.amazonaws.com/`)[1];
      if (oldKey) {
        try {
          await getS3Client().send(
            new DeleteObjectCommand({ Bucket: bucket, Key: oldKey })
          );
        } catch (err) {
          logger.warn({ err }, "Failed to delete S3 object");
        }
      }
    }

    await prisma.implementationPartner.update({
      where: { id },
      data: { logoUrl: null },
    });

    return NextResponse.json(
      { success: true, message: "Logo deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Partner logo delete failed");
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete logo" },
      { status: 500 }
    );
  }
}
