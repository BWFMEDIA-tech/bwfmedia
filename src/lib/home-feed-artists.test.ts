import { describe, expect, it } from "vitest";
import { onlyArtistTracks } from "./home-feed-artists";

describe("onlyArtistTracks", () => {
  const artistIds = new Set(["artist-1", "artist-2"]);

  it("keeps only tracks whose uploader holds the artist role", () => {
    const rows = [
      { artist_user_id: "artist-1", title: "a" },
      { artist_user_id: "member-9", title: "b" },
      { artist_user_id: "artist-2", title: "c" },
    ];
    expect(onlyArtistTracks(rows, artistIds).map((r) => r.title)).toEqual(["a", "c"]);
  });

  it("drops tracks with no uploader id", () => {
    const rows = [{ artist_user_id: null, title: "x" }, { artist_user_id: "artist-1", title: "y" }];
    expect(onlyArtistTracks(rows, artistIds).map((r) => r.title)).toEqual(["y"]);
  });

  it("returns empty for null input", () => {
    expect(onlyArtistTracks(null, artistIds)).toEqual([]);
  });

  it("drops everything when the artist set is empty", () => {
    const rows = [{ artist_user_id: "someone" }];
    expect(onlyArtistTracks(rows, new Set())).toEqual([]);
  });
});

import { onlyWithArtwork, onePerRelease, onePerArtist } from "./home-feed-artists";
describe("release rules", () => {
  it("hides songs without artwork", () => {
    expect(onlyWithArtwork([{ cover_url: "a" }, { cover_url: null }, { cover_url: " " }])).toHaveLength(1);
  });
  it("shows an album once and each single once", () => {
    const rows = [
      { id: 1, artist_user_id: "x", cover_url: "album" },
      { id: 2, artist_user_id: "x", cover_url: "album" },
      { id: 3, artist_user_id: "x", cover_url: "single" },
    ];
    expect(onePerRelease(rows).map((r) => r.id)).toEqual([1, 3]);
  });
});
