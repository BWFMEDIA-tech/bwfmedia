import { describe, expect, it } from "vitest";
import { changedFields } from "./profile-edits";

describe("preserve existing artist profile fields", () => {
  const existing = { display_name: "DANTHEMAN", stage_name: "Dan", bio: "Original bio", avatar_url: "artist/photo.png", genres: ["Hip-Hop"], username: "dantheman" };
  it("saves no fields when the prefilled information is unchanged", () => {
    expect(changedFields(existing, { ...existing, genres: [...existing.genres] })).toEqual({});
  });
  it("saves only the changed bio, preserving name, photo and genres", () => {
    expect(changedFields(existing, { ...existing, bio: "Updated bio" })).toEqual({ bio: "Updated bio" });
  });
  it("allows voluntarily clearing a field without clearing other fields", () => {
    expect(changedFields(existing, { ...existing, stage_name: "" })).toEqual({ stage_name: "" });
  });
  it("keeps a legacy primary genre separate from multigenre selections", () => {
    expect(changedFields({ genre: "Soul", genres: [] as string[] }, { genre: "Soul", genres: ["Jazz"] })).toEqual({ genres: ["Jazz"] });
  });
});