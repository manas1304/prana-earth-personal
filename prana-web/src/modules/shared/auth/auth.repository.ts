import { prisma } from "@/core/database/prisma";
import {
  User,
  RefreshToken,
  PasswordResetToken,
  EmailVerificationToken,
  Session,
  OAuthAccount,
  UserRole,
} from "@/generated/prisma/client";


export const authRepository = {
  // --- User Operations ---

  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async createUser(data: {
    email: string;
    fullName: string;
    passwordHash?: string;
    isEmailVerified?: boolean;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        isEmailVerified: data.isEmailVerified ?? false,
        role: UserRole.USER,
      },
    });
  },

  async updateUser(id: string, data: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  },

  // --- OAuth Operations ---

  async findOAuthAccount(provider: string, providerUserId: string): Promise<OAuthAccount | null> {
    return prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
    });
  },

  async createOAuthAccount(data: {
    userId: string;
    provider: string;
    providerUserId: string;
  }): Promise<OAuthAccount> {
    return prisma.oAuthAccount.create({
      data,
    });
  },

  // --- Refresh Token Operations ---

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data,
    });
  },

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findFirst({
      where: { tokenHash },
    });
  },

  async revokeRefreshToken(id: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  // --- Session Operations ---

  async createSession(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Session> {
    return prisma.session.create({
      data,
    });
  },

  async findSession(tokenHash: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { tokenHash },
    });
  },

  async deleteSession(tokenHash: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { tokenHash },
    });
  },

  async deleteAllSessionsForUser(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  },

  // --- Password Reset Token Operations ---

  async createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.create({
      data,
    });
  },

  async findPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
    return prisma.passwordResetToken.findFirst({
      where: { tokenHash },
    });
  },

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },

  // --- Email Verification Token Operations ---

  async createEmailVerificationToken(data: {
    email: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<EmailVerificationToken> {
    return prisma.emailVerificationToken.create({
      data,
    });
  },

  async findEmailVerificationToken(tokenHash: string): Promise<EmailVerificationToken | null> {
    return prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
  },

  async deleteEmailVerificationToken(id: string): Promise<void> {
    await prisma.emailVerificationToken.delete({
      where: { id },
    });
  },
};
