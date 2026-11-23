import { z } from 'zod';

export const reportCategories = [
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'copyright', label: 'Copyright' },
] as const;
export const reportInput = z.object({
  targetType: z.enum(['direct_message', 'live_message', 'track', 'stream', 'profile']),
  targetId: z.string().uuid(),
  category: z.enum(['inappropriate', 'harassment', 'spam', 'copyright']),
  details: z.string().trim().max(2000).default(''),
});
export type ReportTarget = Pick<z.infer<typeof reportInput>, 'targetType' | 'targetId'>;
export const blockInput = z.object({ userId: z.string().uuid(), blocked: z.boolean() });
export const reviewInput = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'reviewing', 'resolved', 'dismissed']),
  note: z.string().trim().max(2000),
});
export function requireSafetyAgreement(accepted: boolean) {
  if (!accepted) throw new Error('Please agree to the Terms of Service and community safety policy.');
}