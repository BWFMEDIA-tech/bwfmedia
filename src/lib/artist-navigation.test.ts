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
import { hasArtistTools, canGoLive } from "./artist-navigation";
describe("Listener restrictions", () => {
  it("listeners and members cannot use artist tools", () => {
    expect(hasArtistTools(["listener"])).toBe(false);
    expect(hasArtistTools(["member"])).toBe(false);
  });
  it("listeners and members cannot go live", () => {
    expect(canGoLive(["listener"])).toBe(false);
    expect(canGoLive(["member"])).toBe(false);
  });
  it("artists keep their tools", () => {
    expect(hasArtistTools(["artist"])).toBe(true);
    expect(canGoLive(["artist"])).toBe(true);
  });
});
