interface SanitizableUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash?: string | null;
  role?: string;
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
  phone?: string | null;
  jobTitle?: string | null;
  countryRegion?: string | null;
  timezone?: string | null;
  locale?: string | null;
}

export function sanitizeUser(user: SanitizableUser) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    isEmailVerified: user.isEmailVerified ?? false,
    phone: user.phone ?? null,
    jobTitle: user.jobTitle ?? null,
    countryRegion: user.countryRegion ?? null,
    timezone: user.timezone ?? null,
    locale: user.locale ?? null,
  };
}
