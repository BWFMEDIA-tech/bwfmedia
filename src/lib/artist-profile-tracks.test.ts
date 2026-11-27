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
    expect(out[0]?.stream_id).toBe(LIBRARY);
  });

  it("keeps the newest copy when the same song was submitted to multiple arenas", () => {
    const rows = [
      row("Facts", ARENA, "2026-10-01T00:00:00Z"),
      row("facts", "33333333-3333-3333-3333-333333333333", "2026-10-15T03:34:15Z"),
    ];
    const out = dedupeArtistTracks(rows, LIBRARY);
    expect(out).toHaveLength(1);
    expect(out[0]?.created_at).toBe("2026-10-15T03:34:15Z");
  });

  it("returns nothing when the artist has no tracks", () => {
    expect(dedupeArtistTracks([], LIBRARY)).toEqual([]);
  });

  it("shows Where I Come From once despite refreshed signing tokens", () => {
    const rows = [
      { ...row("Where I Come From", ARENA, "2026-10-15"), id: "mirror", source_track_id: "original", audio_url: "/storage/v1/object/sign/artist-audio/play/artist/song.mp3?token=new" },
      { ...row("Where I Come From", LIBRARY, "2026-10-01"), id: "original", audio_url: "/storage/v1/object/sign/artist-audio/play/artist/song.mp3?token=old" },
    ];
    expect(dedupeArtistTracks(rows, LIBRARY).map((track) => track.id)).toEqual(["original"]);
  });

  it("preserves distinct legitimate recordings with the same title", () => {
    const rows = [
      { ...row("12345", LIBRARY, "2026-11-05"), audio_url: "/artist-audio/play/artist/first.m4a" },
      { ...row("12345", LIBRARY, "2026-11-06"), audio_url: "/artist-audio/play/artist/second.m4a" },
    ];
    expect(dedupeArtistTracks(rows, LIBRARY)).toHaveLength(2);
  });

  it("keeps both legitimate TUNEVIO songs titled test", () => {
    const rows = [
      { ...row("test", ARENA, "2026-11-13"), audio_url: "/artist-audio/play/artist/whole-vibe.mp3" },
      { ...row("test", ARENA, "2026-11-19"), audio_url: "/artist-audio/play/artist/Fallen_Soldier.mp3" },
    ];
    expect(dedupeArtistTracks(rows, null)).toHaveLength(2);
  });
});
