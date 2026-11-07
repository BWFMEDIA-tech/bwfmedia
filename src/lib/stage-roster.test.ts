import { describe, expect, it } from "vitest";
import { stableParticipantOrder } from "./stage-roster";

const pdub = { id: "p", user_id: "pdub", joined_at: "2026-11-07T01:00:00Z" };
const media = { id: "b", user_id: "media", joined_at: "2026-11-07T02:00:00Z" };

describe("listener seats", () => {
  it("keeps Pdub and BWFMEDIA in their seats when refresh results reverse", () => {
    expect(stableParticipantOrder([pdub, media], [media, pdub]).map((p) => p.user_id)).toEqual(["pdub", "media"]);
  });
  it("keeps the user's seat when their participant row is recreated", () => {
    expect(stableParticipantOrder([pdub, media], [media, { ...pdub, id: "new", joined_at: "2026-11-07T04:00:00Z" }]).map((p) => p.user_id)).toEqual(["pdub", "media"]);
  });
  it("removes departed listeners and appends new listeners without moving existing seats", () => {
    const newcomer = { id: "n", user_id: "new", joined_at: "2026-11-07T00:00:00Z" };
    expect(stableParticipantOrder([pdub, media], [newcomer, media]).map((p) => p.user_id)).toEqual(["media", "new"]);
  });
  it("orders the first read by join time without changing its input", () => {
    const rows = [media, pdub];
    expect(stableParticipantOrder([], rows)).toEqual([pdub, media]);
    expect(rows).toEqual([media, pdub]);
  });
});