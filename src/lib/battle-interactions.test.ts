import { describe, expect, it } from "vitest";
import { assignedArtistIds, assignedBattleTrack, createInteractionGate, createSnapshotGate } from "./battle-interactions";
import { mergeScoreUpdate, rankArtists, type BattleScoreMap } from "./battle-scores";

const artists = Object.freeze([Object.freeze({ id: "side-a" }), Object.freeze({ id: "side-b" })]);

describe("battle assignments", () => {
  it("keeps the host-selected Side B song over a newer unrelated upload", () => {
    const tracks = [
      { id: "new-upload", artist_user_id: "artist-b", battle_match_id: null, battle_side: null },
      { id: "chosen-b", artist_user_id: "artist-b", battle_match_id: "match", battle_side: "b" },
      { id: "chosen-a", artist_user_id: "artist-a", battle_match_id: "match", battle_side: "a" },
    ];
    expect(assignedBattleTrack(tracks, "match", "b", "artist-b")?.id).toBe("chosen-b");
    expect(assignedBattleTrack(tracks, "match", "a", "artist-a")?.id).toBe("chosen-a");
  });
  it("keeps Side A first when Side B leads Hype", () => {
    const scores = mergeScoreUpdate({}, { artist_id: "side-b", hype_score: 9, pass_score: 0 });
    expect(rankArtists(scores, assignedArtistIds(artists))[0]).toBe("side-b");
    expect(assignedArtistIds(artists)).toEqual(["side-a", "side-b"]);
  });
  it("keeps Side B second when leads alternate and stale frames arrive", () => {
    let scores: BattleScoreMap = {};
    for (const update of [
      { artist_id: "side-b", hype_score: 4, pass_score: 0 },
      { artist_id: "side-a", hype_score: 8, pass_score: 0 },
      { artist_id: "side-b", hype_score: 10, pass_score: 0 },
      { artist_id: "side-b", hype_score: 1, pass_score: 0 },
    ]) {
      scores = mergeScoreUpdate(scores, update);
      expect(assignedArtistIds(artists)).toEqual(["side-a", "side-b"]);
    }
    expect(scores["side-b"].hype_score).toBe(10);
  });
  it("restores identical assignments from a refreshed session", () => {
    expect(assignedArtistIds(JSON.parse(JSON.stringify(artists)))).toEqual(["side-a", "side-b"]);
  });
});

describe("rapid submissions", () => {
  it("accepts just one request before any React rerender", () => {
    const gate = createInteractionGate();
    expect(Array.from({ length: 20 }, () => gate.enter()).filter(Boolean)).toHaveLength(1);
    gate.leave();
    expect(gate.enter()).toBe(true);
  });
});

describe("room refresh races", () => {
  it("rejects an older response arriving after the latest vote refresh", () => {
    const gate = createSnapshotGate();
    const old = gate.begin();
    const latest = gate.begin();
    expect(gate.isCurrent(latest)).toBe(true);
    expect(gate.isCurrent(old)).toBe(false);
  });
  it("rejects responses from a disconnected or previous room", () => {
    const gate = createSnapshotGate();
    const old = gate.begin();
    gate.invalidate();
    expect(gate.isCurrent(old)).toBe(false);
    expect(gate.isCurrent(gate.begin())).toBe(true);
  });
});