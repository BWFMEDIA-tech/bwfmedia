import { describe, it, expect } from "vitest";
import { canAddSplit, countRights, splitTotal } from "./rights";

describe("ownership splits", () => {
  it("totals splits", () => expect(splitTotal([{ share_pct: 50 }, { share_pct: "25.5" }])).toBe(75.5));
  it("allows reaching exactly 100%", () => expect(canAddSplit([{ share_pct: 60 }], 40)).toBe(true));
  it("blocks going over 100%", () => expect(canAddSplit([{ share_pct: 60 }], 40.01)).toBe(false));
});

describe("status counts", () => {
  it("counts submitted as in progress and disputes as issues", () => {
    const c = countRights([{ status: "verified" }, { status: "submitted" }, { status: "in_progress" }, { status: "issue" }, { status: "not_started" }], 1);
    expect(c).toEqual({ total: 4, verified: 1, inProgress: 2, issues: 2 });
  });
});
