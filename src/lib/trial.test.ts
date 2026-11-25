import { describe, it, expect } from "vitest";
import { FREE_TRIAL_DAYS, ARTIST_TRIAL_DAYS, getPlanTrialDays, hasTrialAccess } from "./trial";

const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();

describe("free trial", () => {
  it.each(["artist_pro", "artist_monthly", "bwf_artist_membership_monthly"])("gives %s no free trial", (planId) => {
    expect(ARTIST_TRIAL_DAYS).toBe(0);
    expect(getPlanTrialDays(planId)).toBe(0);
  });
  it.each(["listener_premium", "listener_fan_premium", "listener_student", "label_plan"])("gives %s no free trial", (planId) => {
    expect(getPlanTrialDays(planId)).toBe(0);
  });
  it("gives every plan zero trial days", () => expect(FREE_TRIAL_DAYS).toBe(0));
  it("blocks members with no card/subscription", () => expect(hasTrialAccess(null)).toBe(false));
  it("allows trialing members", () => expect(hasTrialAccess({ status: "trialing", current_period_end: future })).toBe(true));
  it("blocks expired trials", () => expect(hasTrialAccess({ status: "trialing", current_period_end: past })).toBe(false));
  it("blocks incomplete checkouts", () => expect(hasTrialAccess({ status: "incomplete", current_period_end: future })).toBe(false));
});
