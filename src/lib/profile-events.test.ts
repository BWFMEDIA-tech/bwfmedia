import { describe, expect, it } from "vitest";
import { canCreateProfileEvent, eventInputSchema, isSafeEventLink, isUpcomingEvent } from "./profile-events";
describe("profile event rules", () => {
  it("allows artists without a paid plan", () => expect(canCreateProfileEvent(true, false)).toBe(true));
  it("allows label owners and managers", () => { expect(canCreateProfileEvent(false, false, "owner")).toBe(true); expect(canCreateProfileEvent(false, false, "manager")).toBe(true); });
  it("rejects listener and finance creation", () => { expect(canCreateProfileEvent(false, false)).toBe(false); expect(canCreateProfileEvent(false, false, "finance")).toBe(false); });
  it("keeps drafts and cancelled events out of upcoming", () => { for (const status of ["draft", "cancelled"]) expect(isUpcomingEvent({ status, starts_at: "2026-12-01T12:00:00Z", ends_at: null }, Date.parse("2026-11-27"))).toBe(false); });
  it("moves finished shows to history", () => expect(isUpcomingEvent({status: "scheduled", starts_at: "2026-11-26T12:00:00Z", ends_at: null}, Date.parse("2026-11-27"))).toBe(false));
  it("rejects unsafe ticket links", () => { expect(isSafeEventLink("javascript:alert(1)")).toBe(false); expect(isSafeEventLink("https://tickets.example.com/show")).toBe(true); });
  it("rejects an end before its start", () => expect(eventInputSchema.safeParse({title:"Show", starts_at:"2026-12-01T12:00:00Z", ends_at:"2026-12-01T11:00:00Z"}).success).toBe(false));
});