export type VideoUploadAllowance = { limit: number; used: number; remaining: number; resetsAt: string };

export function parseVideoUploadAllowance(value: unknown): VideoUploadAllowance {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Could not check your video allowance.");
  const row = value as Record<string, unknown>;
  if (row.limit !== 2 || typeof row.used !== "number" || !Number.isInteger(row.used) || row.used < 0
    || row.remaining !== Math.max(0, 2 - row.used) || typeof row.resetsAt !== "string"
    || !Number.isFinite(Date.parse(row.resetsAt))) throw new Error("Could not check your video allowance.");
  return { limit: 2, used: row.used, remaining: row.remaining as number, resetsAt: row.resetsAt };
}