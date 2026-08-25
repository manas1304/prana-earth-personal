import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/core/config/env";
import { logger } from "@/core/logger/pino";

const s3Client =
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_REGION
    ? new S3Client({
        region: env.AWS_REGION,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : null;

export const s3Service = {
  async getPresignedUploadUrl(fileName: string, contentType: string) {
    const bucketName = env.AWS_S3_BUCKET_NAME || "prana-marketplace-media";
    const uniqueKey = `marketplace/projects/${Date.now()}-${fileName}`;
    const fileUrl = s3Client
      ? `https://${bucketName}.s3.${env.AWS_REGION}.amazonaws.com/${uniqueKey}`
      : `https://dummy-bucket.s3.amazonaws.com/${uniqueKey}`;

    if (!s3Client) {
      logger.warn({ fileName }, "S3 client not configured. Returning dummy presigned URL.");
      return {
        uploadUrl: `https://dummy-upload-url-s3-unconfigured.com/${uniqueKey}`,
        fileUrl,
      };
    }

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueKey,
        ContentType: contentType,
      });

      // Expires in 15 minutes (900 seconds)
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

      return {
        uploadUrl,
        fileUrl,
      };
    } catch (error) {
      logger.error({ error, fileName }, "Failed to generate presigned upload URL");
      throw error;
    }
  },

  async deleteS3File(fileUrl: string) {
    if (!s3Client) {
      logger.warn({ fileUrl }, "S3 client not configured. Skipping S3 deletion.");
      return;
    }

    const bucketName = env.AWS_S3_BUCKET_NAME || "prana-marketplace-media";

    try {
      // Extract key from S3 URL
      // S3 URLs are typically: https://<bucket>.s3.<region>.amazonaws.com/<key>
      const s3UrlPattern = new RegExp(`https://${bucketName}\\.s3\\.${env.AWS_REGION}\\.amazonaws\\.com/(.+)`);
      const match = fileUrl.match(s3UrlPattern);
      if (!match) {
        logger.warn({ fileUrl }, "Could not match S3 URL pattern, skipping delete");
        return;
      }

      const key = decodeURIComponent(match[1]);

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await s3Client.send(command);
      logger.info({ key }, "Successfully deleted file from S3 bucket");
    } catch (error) {
      logger.error({ error, fileUrl }, "Failed to delete file from S3");
    }
  },
};
