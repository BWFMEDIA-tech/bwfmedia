import { describe, it, expect } from "vitest";
import { FREE_TRIAL_DAYS, hasTrialAccess } from "./trial";

const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();

describe("free trial", () => {
  it("lasts 30 days", () => expect(FREE_TRIAL_DAYS).toBe(30));
  it("blocks members with no card/subscription", () => expect(hasTrialAccess(null)).toBe(false));
  it("allows trialing members", () => expect(hasTrialAccess({ status: "trialing", current_period_end: future })).toBe(true));
  it("blocks expired trials", () => expect(hasTrialAccess({ status: "trialing", current_period_end: past })).toBe(false));
  it("blocks incomplete checkouts", () => expect(hasTrialAccess({ status: "incomplete", current_period_end: future })).toBe(false));
});
