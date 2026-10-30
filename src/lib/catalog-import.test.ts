import { describe, it, expect } from "vitest";
import { validateCatalog, catalogStats } from "./catalog-import";

describe("catalog import validation", () => {
  it("keeps ISRCs exactly as provided", () => {
    const r = validateCatalog("release_title,artist_name,track_title,isrc\nAlbum,Me,Song,USABC2400001\n");
    expect(r.rows[0].isrc).toBe("USABC2400001");
  });
  it("reports missing required columns", () => {
    expect(validateCatalog("title,isrc\nA,B").missingColumns).toEqual(["release_title", "artist_name"]);
  });
  it("flags invalid and duplicate ISRCs without rewriting them", () => {
    const r = validateCatalog("release,artist,track,isrc\nA,Me,One,US-ABC-24-00001\nA,Me,Two,USABC2400001\nA,Me,Three,USABC2400001");
    expect(r.rows.length).toBe(1);
    expect(r.errors.map((e) => e.row)).toEqual([2, 4]);
  });
  it("counts releases, artists and ISRCs from parsed rows", () => {
    const r = validateCatalog('release_title,artist_name,track_title,isrc\n"A, Vol 1",Me,One,USABC2400001\n"A, Vol 1",Me,Two,\nB,You,Three,');
    expect(catalogStats(r.rows)).toEqual({ tracks: 3, releases: 2, artists: 2, isrcs: 1 });
  });
});
