// Shared live-stream categories. Stored on streams.category.
export const LIVE_CATEGORIES = [
  { id: "hip-hop-rap", label: "Hip Hop & Rap" },
  { id: "singers", label: "Singers" },
  { id: "freestyles", label: "Freestyles" },
  { id: "music-review", label: "Music Review" },
] as const;

export type LiveCategoryId = (typeof LIVE_CATEGORIES)[number]["id"];

export function liveCategoryLabel(id: string | null | undefined): string {
  return LIVE_CATEGORIES.find((c) => c.id === id)?.label ?? id ?? "";
}
