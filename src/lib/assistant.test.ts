import { describe, expect, it } from "vitest";
import { allowedAssistantPath, audienceFromRoles } from "./assistant";

describe("assistant links", () => {
  it("allows real pages", () => expect(allowedAssistantPath("/upload")).toBe("/upload"));
  it("allows battle challenges", () => expect(allowedAssistantPath("/play/challenges")).toBe("/play/challenges"));
  it("allows payout settings", () => expect(allowedAssistantPath("/settings/payouts")).toBe("/settings/payouts"));
  it("allows the landing page", () => expect(allowedAssistantPath("/")).toBe("/"));
  it("allows videos", () => expect(allowedAssistantPath("/videos")).toBe("/videos"));
  it("allows admin announcements", () => expect(allowedAssistantPath("/admin/announcements")).toBe("/admin/announcements"));
  it("blocks external links", () => expect(allowedAssistantPath("https://evil.com/upload")).toBeNull());
  it("blocks invented pages", () => expect(allowedAssistantPath("/admin/grant-role")).toBeNull());
  it("blocks invented battle pages", () => expect(allowedAssistantPath("/arena/start")).toBeNull());
});

describe("assistant audience", () => {
  it("signed-out visitors are guests", () => expect(audienceFromRoles(null)).toBe("guest"));
  it("admin wins over artist", () => expect(audienceFromRoles(["artist", "admin"])).toBe("admin"));
  it("members are fans", () => expect(audienceFromRoles(["member"])).toBe("fan"));
});
