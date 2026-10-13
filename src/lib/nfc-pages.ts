// Browser-safe helpers for NFC experience pages.
export const TAB_TYPES = ["music", "video", "product"] as const;
export type TabType = (typeof TAB_TYPES)[number];

export type PageTab = {
  id: string;
  type: TabType;
  title: string;
  subtitle?: string;
  artist?: string;
  date?: string;
  description?: string;
  cover?: string; // storage path
  images?: string[]; // storage paths
  trackIds?: string[];
  videoId?: string;
};

export const TAB_LABELS: Record<TabType, string> = { music: "Music", video: "Video", product: "Product" };

export function newTab(type: TabType): PageTab {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  return { id, type, title: TAB_LABELS[type], ...(type === "music" ? { trackIds: [] } : {}), ...(type === "product" ? { images: [] } : {}) };
}

/** Moves a tab one step left (-1) or right (+1); returns a new array. */
export function moveTab<T>(tabs: T[], index: number, dir: -1 | 1): T[] {
  const to = index + dir;
  if (index < 0 || index >= tabs.length || to < 0 || to >= tabs.length) return tabs;
  const next = tabs.slice();
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** Removes duplicate track ids while keeping order. */
export function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/** Validates a tag order quantity against the product's minimum. */
export function checkTagQuantity(p: { active: boolean; price_cents: number; min_quantity: number }, qty: number): string | null {
  if (!p.active || p.price_cents < 50) return "This tag isn't available yet.";
  if (!Number.isInteger(qty) || qty < Math.max(1, p.min_quantity) || qty > 1000) return `Order between ${Math.max(1, p.min_quantity)} and 1000.`;
  return null;
}
