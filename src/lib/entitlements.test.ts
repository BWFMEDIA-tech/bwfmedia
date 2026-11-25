import { describe, expect, it } from "vitest";
import { perksFor } from "./entitlements";

const now = new Date("2026-11-25T00:00:00Z");
const future = "2026-12-25T00:00:00Z";
const past = "2026-10-01T00:00:00Z";
const sub = (plan: string, status: string, end: string | null = future) => ({ plan_type: plan, price_id: plan, status, current_period_end: end });

describe("plan perks", () => {
  it("Artist Pro unlocks the full dashboard only", () => {
    expect(perksFor([sub("artist_pro", "active")], false, now)).toEqual(["analytics_advanced"]);
  });
  it("Label Plan unlocks the label management panel", () => {
    expect(perksFor([sub("label_plan", "active")], false, now)).toContain("label_panel");
  });
  it("free and listener plans unlock no artist perks", () => {
    expect(perksFor([sub("listener_premium", "active")], false, now)).toEqual([]);
    expect(perksFor([], false, now)).toEqual([]);
  });
  it("canceled plans keep perks until the paid period ends", () => {
    expect(perksFor([sub("artist_pro", "canceled", future)], false, now)).toEqual(["analytics_advanced"]);
    expect(perksFor([sub("artist_pro", "canceled", past)], false, now)).toEqual([]);
  });
  it("admins always get full access", () => {
    expect(perksFor([], true, now)).toContain("label_panel");
  });
});
