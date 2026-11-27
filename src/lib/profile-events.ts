import { z } from "zod";

export const EVENT_TYPES = ["showcase", "tour_date", "listening_party", "festival", "virtual_live", "event", "competition", "live", "podcast", "dj_set", "interview"] as const;
export const eventInputSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  description: z.string().max(5000).nullable().optional(),
  event_type: z.enum(EVENT_TYPES).default("showcase"),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  cover_image_url: z.string().max(2000).nullable().optional(),
  status: z.enum(["draft", "scheduled", "live", "ended", "cancelled"]).default("scheduled"),
  link_url: z.string().max(2000).nullable().optional().refine(v => !v || isSafeEventLink(v), "Use an HTTPS ticket or RSVP link"),
  label_id: z.string().uuid().nullable().optional(),
}).refine(v => !v.ends_at || Date.parse(v.ends_at) > Date.parse(v.starts_at), "End time must be after start time");

export function isSafeEventLink(value: string) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
export function canCreateProfileEvent(isArtist: boolean, isAdmin: boolean, labelRole?: string | null) {
  return isArtist || isAdmin || labelRole === "owner" || labelRole === "manager";
}
export function isUpcomingEvent(event: { status: string; starts_at: string; ends_at: string | null }, now = Date.now()) {
  return ["scheduled", "live"].includes(event.status) && Date.parse(event.ends_at ?? event.starts_at) >= now;
}