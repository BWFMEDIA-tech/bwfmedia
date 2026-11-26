/** Single source of truth for what each paid plan unlocks. Mirrors public.has_entitlement in the database. */
export type Perk = "analytics_advanced" | "label_panel" | "pwyw_store";

export const PLAN_PERKS: Record<string, Perk[]> = {
  artist_pro: ["analytics_advanced", "pwyw_store"],
  artist_monthly: ["analytics_advanced", "pwyw_store"],
  bwf_artist_membership_monthly: ["analytics_advanced", "pwyw_store"],
  label_plan: ["analytics_advanced", "label_panel", "pwyw_store"],
};

export const PERK_UPGRADE: Record<Perk, { plan: string; label: string }> = {
  analytics_advanced: { plan: "artist_pro", label: "Artist Pro" },
  label_panel: { plan: "label_plan", label: "Label Plan" },
  pwyw_store: { plan: "artist_pro", label: "Artist Pro or Label Plan" },
};

export type SubRow = { plan_type: string | null; price_id: string | null; status: string | null; current_period_end: string | null };

export function subscriptionIsCurrent(s: SubRow, now = new Date()): boolean {
  const end = s.current_period_end ? new Date(s.current_period_end) : null;
  if (s.status === "active" || s.status === "trialing" || s.status === "past_due") return !end || end > now;
  if (s.status === "canceled") return !!end && end > now;
  return false;
}

export function perksFor(subs: SubRow[], isAdmin: boolean, now = new Date()): Perk[] {
  if (isAdmin) return ["analytics_advanced", "label_panel", "pwyw_store"];
  const out = new Set<Perk>();
  for (const s of subs) {
    if (!subscriptionIsCurrent(s, now)) continue;
    for (const p of PLAN_PERKS[s.plan_type ?? s.price_id ?? ""] ?? PLAN_PERKS[s.price_id ?? ""] ?? []) out.add(p);
  }
  return [...out];
}
