export type LiveVideoSpotlight = {
  artist: string | null;
  cohost: string | null;
};

export type LiveVideoSlot = "host" | "artist" | "guest";

export function getVisibleLiveVideoSlots(spotlight: LiveVideoSpotlight): LiveVideoSlot[] {
  const slots: LiveVideoSlot[] = ["host"];
  if (spotlight.artist) slots.push("artist");
  if (spotlight.cohost) slots.push("guest");
  return slots;
}