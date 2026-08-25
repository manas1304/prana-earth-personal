import { z } from "zod";

export const CreatePlanSchema = z.object({
  name: z.string().min(1, "Tier name is required").max(255),
  type: z.enum(["FREE", "PREDICT", "MARKETPLACE", "BUNDLE"]),
  description: z.string().optional().nullable(),
  priceMonthly: z.number().nonnegative("Base price monthly must be positive or zero"),
  priceYearly: z.number().nonnegative("Base price yearly must be positive or zero"),
  maxAssessments: z.number().int().nonnegative().optional().nullable(),
  satelliteScans: z.number().int().nonnegative().optional().nullable(),
  documentStorage: z.number().int().nonnegative().optional().nullable(),
  features: z.array(z.string()).default([]),
  isPubliclyVisible: z.boolean().default(true),
  applyDiscount: z.boolean().default(false),
  discountPercentage: z.number().min(0).max(100).optional().nullable(),
  discountDuration: z.number().int().positive().optional().nullable(),
});

export const UpdatePlanSchema = CreatePlanSchema.partial();

export const InitiatePaymentSchema = z.object({
  planId: z.string().min(1, "Invalid plan ID"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
});

export const VerifyPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  paymentId: z.string().min(1, "Payment ID is required"),
  signature: z.string().min(1, "Signature is required"),
});
