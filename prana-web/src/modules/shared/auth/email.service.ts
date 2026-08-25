import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { env } from "@/core/config/env";
import { logger } from "@/core/logger/pino";

// Initialize AWS SES client if credentials are provided
const sesClient =
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_REGION
    ? new SESClient({
        region: env.AWS_REGION,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : null;

export const emailService = {
  async sendContactSubmissionEmail(
    email: string,
    fullName: string,
    subject: string,
  ): Promise<void> {
    const htmlBody = `
      <h1>Thanks for reaching out to Prana Earth</h1>
      <p>Hi ${fullName},</p>
      <p>We have received your message about <strong>${subject}</strong> and our team will get back to you shortly.</p>
      <p>Regards,<br/>Prana Earth Team</p>
    `;

    logger.info({ email }, "Sending contact confirmation email");

    if (!sesClient) {
      logger.warn(
        { email },
        "AWS SES client not configured. Contact confirmation email logged above.",
      );
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: env.AWS_SES_FROM_EMAIL || "no-reply@prana.earth",
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: "We received your message - Prana Earth" },
          Body: { Html: { Data: htmlBody } },
        },
      });

      await sesClient.send(command);
      logger.info({ email }, "Contact confirmation email sent successfully");
    } catch (error) {
      logger.error(
        { error, email },
        "Failed to send contact confirmation email via AWS SES",
      );
      throw error;
    }
  },

  async sendContactReplyEmail(
    email: string,
    fullName: string,
    replyMessage: string,
  ): Promise<void> {
    const htmlBody = `
      <h1>Reply from Prana Earth</h1>
      <p>Hi ${fullName},</p>
      <div>${replyMessage}</div>
      <p>Regards,<br/>Prana Earth Team</p>
    `;

    logger.info({ email }, "Sending contact reply email");

    if (!sesClient) {
      logger.warn(
        { email },
        "AWS SES client not configured. Contact reply email logged above.",
      );
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: env.AWS_SES_FROM_EMAIL || "no-reply@prana.earth",
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: "Reply from Prana Earth" },
          Body: { Html: { Data: htmlBody } },
        },
      });

      await sesClient.send(command);
      logger.info({ email }, "Contact reply email sent successfully");
    } catch (error) {
      logger.error(
        { error, email },
        "Failed to send contact reply email via AWS SES",
      );
      throw error;
    }
  },

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/sites/predict/verify-email?token=${token}`;
    const subject = "Verify your email address - Prana Earth";
    const htmlBody = `
      <h1>Welcome to Prana Earth</h1>
      <p>Please click the link below to verify your email address. This link is valid for 24 hours.</p>
      <a href="${verificationUrl}" target="_blank">${verificationUrl}</a>
    `;

    logger.info({ email }, "Sending verification email");

    if (!sesClient) {
      logger.warn(
        { email, verificationUrl },
        "AWS SES client not configured. Verification email logged above.",
      );
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: env.AWS_SES_FROM_EMAIL || "no-reply@prana.earth",
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: htmlBody },
          },
        },
      });

      await sesClient.send(command);
      logger.info({ email }, "Verification email sent successfully");
    } catch (error) {
      logger.error(
        { error, email },
        "Failed to send verification email via AWS SES",
      );
      throw error;
    }
  },

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/sites/predict/reset-password?token=${token}`;
    const subject = "Reset your password - Prana Earth";
    const htmlBody = `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Please click the link below to set a new password. This link is valid for 15 minutes.</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>If you did not request this, you can safely ignore this email.</p>
    `;

    logger.info({ email }, "Sending password reset email");

    if (!sesClient) {
      logger.warn(
        { email, resetUrl },
        "AWS SES client not configured. Password reset email logged above.",
      );
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: env.AWS_SES_FROM_EMAIL || "no-reply@prana.earth",
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: htmlBody },
          },
        },
      });

      await sesClient.send(command);
      logger.info({ email }, "Password reset email sent successfully");
    } catch (error) {
      logger.error(
        { error, email },
        "Failed to send password reset email via AWS SES",
      );
      throw error;
    }
  },

  async sendExpressInterestReplyEmail(
    email: string,
    fullName: string,
    projectName: string,
    replyMessage: string,
  ): Promise<void> {
    const htmlBody = `
      <h1>Express Interest Inquiry Reply</h1>
      <p>Hi ${fullName},</p>
      <p>Thank you for expressing interest in our project: <strong>${projectName}</strong>.</p>
      <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #1a82c4; background-color: #f9f9f9;">
        ${replyMessage.replace(/\n/g, "<br/>")}
      </div>
      <p>Regards,<br/>Prana Earth Team</p>
    `;

    logger.info({ email }, "Sending express interest reply email");

    if (!sesClient) {
      logger.warn(
        { email },
        "AWS SES client not configured. Express interest reply email logged above.",
      );
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: env.AWS_SES_FROM_EMAIL || "no-reply@prana.earth",
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: `Inquiry Update: ${projectName} - Prana Earth` },
          Body: { Html: { Data: htmlBody } },
        },
      });

      await sesClient.send(command);
      logger.info({ email }, "Express interest reply email sent successfully");
    } catch (error) {
      logger.error(
        { error, email },
        "Failed to send express interest reply email via AWS SES",
      );
      throw error;
    }
  },

  async sendDprRequestReplyEmail(
    email: string,
    fullName: string,
    projectName: string,
    replyMessage: string,
  ): Promise<void> {
    const htmlBody = `
      <h1>Detailed Project Report (DPR) Inquiry Update</h1>
      <p>Hi ${fullName},</p>
      <p>This is an update regarding your DPR request for the project: <strong>${projectName}</strong>.</p>
      <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #10b981; background-color: #f0fdf4;">
        ${replyMessage.replace(/\n/g, "<br/>")}
      </div>
      <p>Regards,<br/>Prana Earth Team</p>
    `;

    logger.info({ email }, "Sending DPR request reply email");

    if (!sesClient) {
      logger.warn(
        { email },
        "AWS SES client not configured. DPR request reply email logged above.",
      );
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: env.AWS_SES_FROM_EMAIL || "no-reply@prana.earth",
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: `DPR Request Status Update: ${projectName} - Prana Earth` },
          Body: { Html: { Data: htmlBody } },
        },
      });

      await sesClient.send(command);
      logger.info({ email }, "DPR request reply email sent successfully");
    } catch (error) {
      logger.error(
        { error, email },
        "Failed to send DPR request reply email via AWS SES",
      );
      throw error;
    }
  },
};
