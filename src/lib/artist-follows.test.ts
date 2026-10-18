import { describe, expect, it } from "vitest";
import { followedArtistIdsInput } from "./artist-follows.functions";

const ID = "3f0a1c2e-5b4d-4a6e-9c1f-7d2e8b3a4c5f";

describe("followedArtistIdsInput", () => {
  it("accepts a bounded list of artist ids", () => {
    expect(followedArtistIdsInput.parse({ artistIds: [ID] }).artistIds).toEqual([ID]);
  });

  it("rejects a non-uuid artist id", () => {
    expect(() => followedArtistIdsInput.parse({ artistIds: ["not-a-uuid"] })).toThrow();
  });

  it("rejects a lookup of more than 500 artists", () => {
    expect(() => followedArtistIdsInput.parse({ artistIds: Array(501).fill(ID) })).toThrow();
  });
});
