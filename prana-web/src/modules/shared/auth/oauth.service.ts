import { OAuth2Client } from "google-auth-library";
import { env } from "@/core/config/env";
import { BadRequestError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";

// Lazy-initialized Google OAuth Client
let googleClient: OAuth2Client | null = null;

function getGoogleClient() {
  if (!googleClient && env.GOOGLE_CLIENT_ID) {
    googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

export interface OAuthUserInfo {
  email: string;
  name: string;
  avatarUrl?: string;
  providerUserId: string;
}

export const oauthService = {
  /**
   * Verify an ID token with Google's servers.
   * Supports future providers by extending this service.
   */
  async verifyGoogleToken(idToken: string): Promise<OAuthUserInfo> {
    logger.info("Verifying Google OAuth ID Token");

    // In local development, allow a mock payload for developer convenience
    if (process.env.NODE_ENV !== "production" && (!env.GOOGLE_CLIENT_ID || idToken === "mock-google-id-token")) {
      logger.warn("Bypassing token verification with a mock account (dev mode).");
      return {
        email: "mock-google-user@prana.earth",
        name: "Mock Google User",
        avatarUrl: "https://avatar.vercel.sh/mock-google",
        providerUserId: "mock-google-sub-12345",
      };
    }

    const client = getGoogleClient();
    if (!client) {
      throw new BadRequestError("Google OAuth is not configured on this server");
    }

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.sub) {
        throw new BadRequestError("Invalid Google ID Token payload");
      }

      return {
        email: payload.email,
        name: payload.name || payload.email.split("@")[0],
        avatarUrl: payload.picture,
        providerUserId: payload.sub,
      };
    } catch (error) {
      logger.error({ error }, "Google token verification failed");
      throw new BadRequestError("Invalid Google ID Token");
    }
  },
};
