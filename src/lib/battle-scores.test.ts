import { describe, expect, it } from "vitest";
import { mergeScoreUpdate, rankArtists, type BattleScoreMap } from "./battle-scores";

const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "aaaaaaaa-0000-0000-0000-000000000002";

describe("mergeScoreUpdate", () => {
  it("creates an entry with net score and rev 1", () => {
    const map = mergeScoreUpdate({}, { artist_id: A, hype_score: 10, pass_score: 3 });
    expect(map[A]).toMatchObject({ hype_score: 10, pass_score: 3, battle_score: 7, rev: 1 });
  });

  it("never regresses counters on out-of-order frames", () => {
    let map: BattleScoreMap = {};
    map = mergeScoreUpdate(map, { artist_id: A, hype_score: 12, pass_score: 4 });
    map = mergeScoreUpdate(map, { artist_id: A, hype_score: 11, pass_score: 5 }); // stale hype, fresh pass
    expect(map[A]).toMatchObject({ hype_score: 12, pass_score: 5, battle_score: 7 });
  });

  it("returns the same reference when nothing changed", () => {
    const first = mergeScoreUpdate({}, { artist_id: A, hype_score: 2, pass_score: 1 });
    const second = mergeScoreUpdate(first, { artist_id: A, hype_score: 2, pass_score: 1 });
    expect(second).toBe(first);
  });

  it("bumps rev on every real change so the UI can pulse", () => {
    let map = mergeScoreUpdate({}, { artist_id: A, hype_score: 1, pass_score: 0 });
    map = mergeScoreUpdate(map, { artist_id: A, hype_score: 2, pass_score: 0 });
    map = mergeScoreUpdate(map, { artist_id: A, hype_score: 2, pass_score: 1 });
    expect(map[A].rev).toBe(3);
  });

  it("keeps other artists untouched", () => {
    let map = mergeScoreUpdate({}, { artist_id: A, hype_score: 5, pass_score: 0 });
    map = mergeScoreUpdate(map, { artist_id: B, hype_score: 1, pass_score: 2 });
    expect(map[A].battle_score).toBe(5);
    expect(map[B].battle_score).toBe(-1);
  });
});

describe("rankArtists", () => {
  it("orders by net score, leader first, stable for ties", () => {
    let map: BattleScoreMap = {};
    map = mergeScoreUpdate(map, { artist_id: A, hype_score: 3, pass_score: 1 });
    map = mergeScoreUpdate(map, { artist_id: B, hype_score: 9, pass_score: 2 });
    expect(rankArtists(map, [A, B])).toEqual([B, A]);
    expect(rankArtists({}, [A, B])).toEqual([A, B]);
  });
});
