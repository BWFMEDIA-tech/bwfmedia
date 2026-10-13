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

/** Moves an id one step up (-1) or down (+1) in an ordered list. */
export function moveId(ids: string[], index: number, dir: -1 | 1): string[] {
  const to = index + dir;
  if (index < 0 || index >= ids.length || to < 0 || to >= ids.length) return ids;
  const next = ids.slice();
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

// ---------- Tag order statuses ----------
export const FULFILLMENT_STEPS = ["unfulfilled", "processing", "shipped", "delivered", "cancelled"] as const;
export type Fulfillment = (typeof FULFILLMENT_STEPS)[number];
const NEXT: Record<Fulfillment, Fulfillment[]> = {
  unfulfilled: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
/** Fulfillment moves an admin may make; only paid orders can move at all. */
export function allowedFulfillment(payment: string, from: string): Fulfillment[] {
  if (payment !== "paid") return [];
  return NEXT[from as Fulfillment] ?? [];
}
export type OrderStatusLabel = "Pending Payment" | "Paid" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Refunded";
/** Single customer-facing status combining payment and fulfillment. */
export function tagOrderStatus(o: { status: string; fulfillment_status: string }): OrderStatusLabel {
  if (o.status === "refunded") return "Refunded";
  if (o.status === "cancelled" || o.status === "failed" || o.fulfillment_status === "cancelled") return "Cancelled";
  if (o.status !== "paid") return "Pending Payment";
  return ({ processing: "Processing", shipped: "Shipped", delivered: "Delivered" } as Record<string, OrderStatusLabel>)[o.fulfillment_status] ?? "Paid";
}
/** Server-side validation for admin pricing input. Returns an error or null. */
export function checkTagPricing(p: { price_cents: number; shipping_cents: number; min_quantity: number; active: boolean }): string | null {
  for (const k of ["price_cents", "shipping_cents", "min_quantity"] as const) if (!Number.isInteger(p[k])) return "Prices and quantities must be whole numbers.";
  if (p.shipping_cents < 0 || p.price_cents < 0) return "Prices can't be negative.";
  if (p.min_quantity < 1 || p.min_quantity > 1000) return "Minimum quantity must be 1–1000.";
  if (p.active && p.price_cents < 50) return "Set a unit price of at least $0.50 before turning ordering on.";
  return null;
}
