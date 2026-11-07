import { expect, it } from "vitest";
import { arenaSubmissionChoices } from "./arena-picker";
it("excludes internal profile libraries while preserving live and idle Arena destinations", () => {
  const rows = [{ id: "library", title: "__profile_library__", status: "idle" }, { id: "live", title: "Tunevio Arena", status: "live" }, { id: "idle", title: "Saturday Showcase", status: "idle" }];
  expect(arenaSubmissionChoices(rows).map((r) => r.id)).toEqual(["live", "idle"]);
});