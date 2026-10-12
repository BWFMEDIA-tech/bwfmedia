export type LiveVideoSpotlight = {
  artist: string | null;
  cohost: string | null;
  guest?: string | null;
};

export type LiveVideoSlot = "host" | "artist" | "cohost" | "guest";

export function getVisibleLiveVideoSlots(spotlight: LiveVideoSpotlight): LiveVideoSlot[] {
  const slots: LiveVideoSlot[] = ["host"];
  if (spotlight.artist) slots.push("artist");
  if (spotlight.cohost) slots.push("cohost");
  if (spotlight.guest) slots.push("guest");
  return slots;
}