import { describe, expect, it } from "vitest";
import { eligibleLevels, milestoneProgress } from "./certifications";

describe("certification milestones", () => {
  it("51.25M streams is 68% to Gold with 23.75M remaining", () => {
    const p = milestoneProgress(51_250_000);
    expect(p.next?.key).toBe("gold");
    expect(p.percent).toBe(68);
    expect(p.remaining).toBe(23_750_000);
  });
  it("Bronze needs 15M streams", () => {
    expect(eligibleLevels(14_999_999)).toEqual([]);
    expect(eligibleLevels(15_000_000)).toEqual(["bronze"]);
  });
  it("Diamond needs 1.5B streams", () => {
    expect(eligibleLevels(1_500_000_000)).toContain("diamond");
    expect(milestoneProgress(1_500_000_000).next).toBeNull();
  });
});
