import { describe, expect, it } from "vitest";
import { rankTop100 } from "./chart-ranking";

const t = (id: string, plays: number, extra: Record<string, unknown> = {}) => ({
  id, title: `Song ${id}`, artistName: "A", artistUserId: `u${id}`, coverUrl: "cover.jpg", playCount: plays, likeCount: 0, rating: 0, ...extra,
});

describe("Billboard Top 100", () => {
  it("ranks 9M plays above 8M plays", () => {
    expect(rankTop100([t("a", 8_000_000), t("b", 9_000_000)]).map((x) => x.id)).toEqual(["b", "a"]);
  });
  it("never lists the same track twice", () => {
    const r = rankTop100([t("a", 5), t("a", 5), t("b", 3, { title: "Song a", artistUserId: "ua" })]);
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });
  it("excludes tracks without artwork", () => {
    expect(rankTop100([t("a", 10, { coverUrl: null }), t("b", 1, { coverUrl: " " }), t("c", 2)]).map((x) => x.id)).toEqual(["c"]);
  });
  it("ignores likes and ratings", () => {
    const r = rankTop100([t("a", 1, { likeCount: 999, rating: 5 }), t("b", 2)]);
    expect(r[0].id).toBe("b");
  });
  it("caps at 100 unique songs", () => {
    const many = Array.from({ length: 150 }, (_, i) => t(String(i), i));
    const r = rankTop100(many);
    expect(r).toHaveLength(100);
    expect(r[0].playCount).toBe(149);
  });
});
