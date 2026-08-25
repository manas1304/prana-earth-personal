import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32).default("default_jwt_access_secret_32_characters_long"),
  JWT_REFRESH_SECRET: z.string().min(32).default("default_jwt_refresh_secret_32_characters_long"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_SES_FROM_EMAIL: z.string().email().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);

