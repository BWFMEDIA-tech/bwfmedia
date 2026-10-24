import { describe, expect, it } from "vitest";
import { dedupeArtistTracks } from "./artist-profile-tracks";

const LIBRARY = "11111111-1111-1111-1111-111111111111";
const ARENA = "22222222-2222-2222-2222-222222222222";

function row(title: string, streamId: string | null, createdAt: string) {
  return { title, stream_id: streamId, created_at: createdAt };
}

describe("dedupeArtistTracks", () => {
  it("keeps arena-submitted songs that are not in the profile library", () => {
    const rows = [
      row("Facts", ARENA, "2026-10-15T03:34:15Z"),
      row("Gangsta like me", ARENA, "2026-10-07T20:37:31Z"),
    ];
    const out = dedupeArtistTracks(rows, LIBRARY);
    expect(out.map((r) => r.title).sort()).toEqual(["Facts", "Gangsta like me"]);
  });

  it("prefers the profile-library copy when a song exists in both", () => {
    const rows = [
      row("Facts", ARENA, "2026-10-15T03:34:15Z"),
      row("Facts", LIBRARY, "2026-10-01T00:00:00Z"),
    ];
    const out = dedupeArtistTracks(rows, LIBRARY);
    expect(out).toHaveLength(1);
    expect(out[0].stream_id).toBe(LIBRARY);
  });

  it("keeps the newest copy when the same song was submitted to multiple arenas", () => {
    const rows = [
      row("Facts", ARENA, "2026-10-01T00:00:00Z"),
      row("facts", "33333333-3333-3333-3333-333333333333", "2026-10-15T03:34:15Z"),
    ];
    const out = dedupeArtistTracks(rows, LIBRARY);
    expect(out).toHaveLength(1);
    expect(out[0].created_at).toBe("2026-10-15T03:34:15Z");
  });

  it("returns nothing when the artist has no tracks", () => {
    expect(dedupeArtistTracks([], LIBRARY)).toEqual([]);
  });
});
