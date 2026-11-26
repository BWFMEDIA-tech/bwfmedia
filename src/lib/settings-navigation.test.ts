import { describe, expect, it } from "vitest";
import { settingsGroups } from "./settings-navigation";

const keys = (roles: string[]) => settingsGroups(roles).map((g) => g.key);

describe("General Settings sections", () => {
  it("listeners see account, preferences and support only", () => {
    expect(keys(["listener"])).toEqual(["account", "preferences", "support"]);
  });
  it("artists see all five sections", () => {
    expect(keys(["artist"])).toEqual(["account", "preferences", "artist", "store", "support"]);
  });
  it("artists have one existing profile editor rather than duplicate profile destinations", () => {
    const destinations = settingsGroups(["artist"]).flatMap(group => group.items.map(item => item.to));
    expect(destinations.filter(to => to === "/settings/profile")).toHaveLength(1);
    expect(destinations).not.toContain("/settings/artist-info");
    expect(destinations).not.toContain("/profile");
  });
  it("hosts get payouts but no artist tools", () => {
    expect(keys(["host"])).toEqual(["account", "preferences", "store", "support"]);
  });
});
