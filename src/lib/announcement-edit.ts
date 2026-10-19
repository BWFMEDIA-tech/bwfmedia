import { z } from "zod";

export const announcementContentSchema = z.object({
  kind: z.enum(["update", "event"]),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(500).optional(),
  link: z.string().trim().max(200).refine((value) => !value || (/^\/[A-Za-z0-9/_\-?=&.#]*$/.test(value) && !value.startsWith("//")), "Use a Tunevio page link").optional(),
  mediaPath: z.string().regex(/^[A-Za-z0-9/_\-.]+$/).max(300).optional(),
  mediaType: z.enum(["image", "video"]).optional(),
});

export type SentAnnouncement = {
  id: string; actor_id: string | null; created_at: string; type: string;
  title: string; body: string | null; link: string | null;
  media_url: string | null; media_type: string | null;
};

export function groupAnnouncements(rows: SentAnnouncement[]) {
  const groups = new Map<string, SentAnnouncement>();
  for (const row of rows) {
    const key = JSON.stringify([row.actor_id, row.created_at, row.type, row.title, row.body, row.link, row.media_url, row.media_type]);
    if (!groups.has(key)) groups.set(key, row);
  }
  return [...groups.values()];
}