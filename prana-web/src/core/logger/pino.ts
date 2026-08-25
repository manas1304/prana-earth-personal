import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  redact: {
    paths: [
      "password",
      "*.password",
      "passwordConfirm",
      "*.passwordConfirm",
      "oldPassword",
      "*.oldPassword",
      "newPassword",
      "*.newPassword",
      "token",
      "*.token",
      "tokenHash",
      "*.tokenHash",
      "accessToken",
      "*.accessToken",
      "refreshToken",
      "*.refreshToken",
      "jwt",
      "*.jwt",
      "authorization",
      "headers.authorization",
      "cookie",
      "headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
        },
      }
    : undefined,
});
