import { describe, expect, it } from "vitest";
import { allowedAssistantPath, audienceFromRoles } from "./assistant";

describe("assistant links", () => {
  it("allows real pages", () => expect(allowedAssistantPath("/upload")).toBe("/upload"));
  it("blocks external links", () => expect(allowedAssistantPath("https://evil.com/upload")).toBeNull());
  it("blocks invented pages", () => expect(allowedAssistantPath("/admin/grant-role")).toBeNull());
});

describe("assistant audience", () => {
  it("signed-out visitors are guests", () => expect(audienceFromRoles(null)).toBe("guest"));
  it("admin wins over artist", () => expect(audienceFromRoles(["artist", "admin"])).toBe("admin"));
  it("members are fans", () => expect(audienceFromRoles(["member"])).toBe("fan"));
});
