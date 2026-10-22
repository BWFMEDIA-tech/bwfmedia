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
  it("hosts get payouts but no artist tools", () => {
    expect(keys(["host"])).toEqual(["account", "preferences", "store", "support"]);
  });
});
