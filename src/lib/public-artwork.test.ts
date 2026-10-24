import { describe, expect, it } from "vitest";
import { avatarObjectPath, publicArtworkPaths } from "./public-artwork";

const owner = "85a8f0da-bb21-4b1c-a727-2b6ed507d9ce";
const path = `${owner}/cover.jpg`;
const url = (p: string) => `https://example.test/storage/v1/object/public/avatars/${p}?v=123`;

function database(profiles: object[], tracks: { cover_url: string; status: string; artist_user_id?: string; streams?: { title: string; host_id: string } }[]) {
  return { from: (table: string) => {
    let rows = table === "profiles" ? profiles : tracks;
    const query = {
      select: () => query,
      in: (column: string, values: string[]) => {
        if (column === "status") rows = tracks.filter((r) => values.includes(r.status));
        return query;
      },
      or: () => query,
      then: (resolve: (result: { data: object[] }) => void) => resolve({ data: rows }),
    };
    return query;
  } };
}

describe("public artwork signing boundary", () => {
  it("allows a published song cover without granting access to other uploads", async () => {
    const db = database([], [{ cover_url: url(path), status: "completed" }]);
    expect([...await publicArtworkPaths(db, [path, `${owner}/private.jpg`])]).toEqual([path]);
  });
  it("does not expose pending song artwork", async () => {
    expect((await publicArtworkPaths(database([], [{ cover_url: url(path), status: "pending" }]), [path])).size).toBe(0);
  });
  it("allows queued songs saved in the artist's own profile library", async () => {
    const db = database([], [{ cover_url: url(path), status: "queued", artist_user_id: owner,
      streams: { title: "__profile_library__", host_id: owner } }]);
    expect([...await publicArtworkPaths(db, [path, `${owner}/private.jpg`])]).toEqual([path]);
  });
  it("does not expose queued Arena submission covers", async () => {
    const db = database([], [{ cover_url: url(path), status: "queued", artist_user_id: owner,
      streams: { title: "Arena", host_id: owner } }]);
    expect((await publicArtworkPaths(db, [path])).size).toBe(0);
  });
  it("does not authorize queued artwork through another artist's library", async () => {
    const db = database([], [{ cover_url: url(path), status: "queued", artist_user_id: owner,
      streams: { title: "__profile_library__", host_id: "another-user" } }]);
    expect((await publicArtworkPaths(db, [path])).size).toBe(0);
  });
  it("does not expose unattached uploads or queued songs without a library", async () => {
    expect((await publicArtworkPaths(database([], [{ cover_url: url(path), status: "queued" }]), [path])).size).toBe(0);
    expect((await publicArtworkPaths(database([], []), [path])).size).toBe(0);
  });
  it("allows current brand photos and banners but not unreferenced files", async () => {
    const db = database([{ brand_avatar_url: url(`${owner}/brand.png`), banner_url: url(`${owner}/banner.jpg`) }], []);
    expect([...await publicArtworkPaths(db, [`${owner}/brand.png`, `${owner}/banner.jpg`, path])]).toEqual([`${owner}/brand.png`, `${owner}/banner.jpg`]);
  });
  it("normalizes expired signed references and rejects invalid owner paths", () => {
    expect(avatarObjectPath(`https://example.test/storage/v1/object/sign/avatars/${path}?token=expired`)).toBe(path);
    expect(avatarObjectPath(`${owner}/../private.jpg`)).toBeNull();
    expect(avatarObjectPath("not-a-user/cover.jpg")).toBeNull();
  });
});