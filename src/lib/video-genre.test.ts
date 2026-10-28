import { describe, expect, it } from "vitest";
import { videoMatchesGenre } from "./video-genre";

describe("videoMatchesGenre", () => {
  it("matches the stored genre exactly", () => {
    expect(videoMatchesGenre({ title: "t", genre: "R&B" }, "R&B")).toBe(true);
    expect(videoMatchesGenre({ title: "t", genre: "Hip Hop" }, "R&B")).toBe(false);
    expect(videoMatchesGenre({ title: "t", genre: "Hip Hop" }, "Hip Hop")).toBe(true);
  });

  it("is case-insensitive on the stored genre", () => {
    expect(videoMatchesGenre({ title: "t", genre: "hip hop" }, "Hip Hop")).toBe(true);
  });

  it("falls back to text matching when no genre is stored", () => {
    expect(videoMatchesGenre({ title: "Freestyle", description: "trap rap video" }, "Hip Hop")).toBe(true);
    expect(videoMatchesGenre({ title: "Slow jam", description: "r&b vibes" }, "R&B")).toBe(true);
    expect(videoMatchesGenre({ title: "Slow jam", description: "nothing here" }, "Pop")).toBe(false);
  });

  it("always matches All genres", () => {
    expect(videoMatchesGenre({ title: "t" }, "All genres")).toBe(true);
  });
});
