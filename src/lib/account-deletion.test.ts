import { describe, expect, it } from "vitest";
import { deleteAccountInput, financialRetentionUntil } from "./account-deletion";

describe("account deletion safeguards", () => {
  it("retains finances for seven calendar years after deletion", () => {
    expect(financialRetentionUntil(new Date("2026-11-23T05:43:00Z")).toISOString()).toBe("2033-11-23T05:43:00.000Z");
    expect(financialRetentionUntil(new Date("2028-02-29T00:00:00Z")).toISOString()).toBe("2035-02-28T00:00:00.000Z");
  });
  it("requires deliberate confirmation and does not accept a target account", () => {
    expect(deleteAccountInput.safeParse({ confirmation: "delete" }).success).toBe(false);
    expect(deleteAccountInput.parse({ confirmation: "DELETE", userId: "someone-else" })).toEqual({ confirmation: "DELETE" });
  });
});