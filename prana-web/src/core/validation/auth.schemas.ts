import { z } from "zod";

// Reusable password validation schema
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password cannot exceed 128 characters")
  .refine(
    (val) => /[A-Z]/.test(val),
    "Password must contain at least one uppercase letter",
  )
  .refine(
    (val) => /[a-z]/.test(val),
    "Password must contain at least one lowercase letter",
  )
  .refine(
    (val) => /[0-9]/.test(val),
    "Password must contain at least one number",
  )
  .refine(
    (val) => /[^A-Za-z0-9]/.test(val),
    "Password must contain at least one special character",
  );

export const RegisterSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    // Optional fields captured by the predict /marketplace register UI
    // (login page "Create account" tab). All optional — service falls
    // back to null when omitted.
    phone: z.string().max(30).optional().nullable(),
    company: z.string().max(100).optional().nullable(),
    jobTitle: z.string().max(100).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    agreed: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const ResendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const UpdateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .optional(),
  phone: z.string().max(30).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  countryRegion: z.string().max(100).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  locale: z.string().max(20).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const GoogleLoginSchema = z.object({
  idToken: z.string().min(1, "Google ID Token is required"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type GoogleLoginInput = z.infer<typeof GoogleLoginSchema>;
