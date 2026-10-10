import { describe, expect, it } from "vitest";
import { artistDashboardDestination } from "./artist-navigation";

describe("Artist Dashboard entry", () => {
  it("takes registered artists to their dashboard", () => {
    expect(artistDashboardDestination(["artist"])).toBe("/artist-dashboard");
  });
  it("takes visitors and non-artists to artist signup instead of a dead end", () => {
    for (const roles of [[], ["member"], ["host"], ["listener"]]) {
      expect(artistDashboardDestination(roles)).toBe("/signup");
    }
  });
  it("preserves existing administrator dashboard access", () => {
    expect(artistDashboardDestination(["admin"])).toBe("/artist-dashboard");
  });
});