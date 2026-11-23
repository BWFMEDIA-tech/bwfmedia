import { z } from "zod";

export const ACCOUNT_RETENTION_YEARS = 7;
export const deleteAccountInput = z.object({ confirmation: z.literal("DELETE") });

/** Calendar years, clamped for February 29 (rather than seven 365-day periods). */
export function financialRetentionUntil(deletedAt: Date): Date {
  const result = new Date(deletedAt);
  const month = result.getUTCMonth();
  result.setUTCFullYear(result.getUTCFullYear() + ACCOUNT_RETENTION_YEARS);
  if (result.getUTCMonth() !== month) result.setUTCDate(0);
  return result;
}