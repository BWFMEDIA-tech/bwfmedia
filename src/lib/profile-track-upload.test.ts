import { expect, it, vi } from "vitest";
import { ARTIST_UPLOAD_ONLY_MESSAGE, checkSongUploadAllowance, saveUploadedProfileTrack, STARTER_SONG_LIMIT_MESSAGE } from "./profile-track-upload";

function setup(error: Error | null = null) {
  const saved = { id: "saved-profile-song", title: "New song", artist_name: "Artist", cover_url: "cover" };
  const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: error ? null : saved, error }) }) }));
  const rpc = vi.fn(async (name: string) => ({ data: name === "get_song_upload_allowance" ? { limit: 5, used: 4, remaining: 1 } : "owner-profile-library", error: null }));
  const client = { auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) }, rpc, from: () => ({ insert }) };
  return { client: client as unknown as Parameters<typeof saveUploadedProfileTrack>[0], insert, rpc, saved };
}
const input = { title: " New song ", artistName: " Artist ", audioUrl: "owned-audio", coverUrl: "cover", durationSeconds: 185 };

it("saves an Arena upload in the authenticated artist's profile before returning its selectable ID", async () => {
  const { client, insert, rpc, saved } = setup();
  expect(await saveUploadedProfileTrack(client, input)).toEqual(saved);
  expect(rpc).toHaveBeenCalledWith("get_or_create_profile_stream");
  expect(insert).toHaveBeenCalledWith({ stream_id: "owner-profile-library", artist_user_id: "owner", title: "New song", artist_name: "Artist", audio_url: "owned-audio", cover_url: "cover", duration_seconds: 185, status: "queued" });
});

it("does not return a song for Arena selection when saving to the profile fails", async () => {
  const { client } = setup(new Error("Profile save failed"));
  await expect(saveUploadedProfileTrack(client, input)).rejects.toThrow("Profile save failed");
});

it("allows the fifth Starter song when four have been uploaded", async () => {
  const { client, insert } = setup();
  await saveUploadedProfileTrack(client, input);
  expect(insert).toHaveBeenCalledTimes(1);
});

it("blocks a sixth Starter song before saving", async () => {
  const { client, rpc, insert } = setup();
  rpc.mockResolvedValueOnce({ data: { limit: 5, used: 5, remaining: 0 }, error: null });
  await expect(saveUploadedProfileTrack(client, input)).rejects.toThrow(STARTER_SONG_LIMIT_MESSAGE);
  expect(insert).not.toHaveBeenCalled();
});

it("blocks listener track uploads before storage or catalog saving", async () => {
  const { client, rpc, insert } = setup();
  rpc.mockRejectedValueOnce(new Error(ARTIST_UPLOAD_ONLY_MESSAGE));
  await expect(saveUploadedProfileTrack(client, input)).rejects.toThrow(ARTIST_UPLOAD_ONLY_MESSAGE);
  expect(insert).not.toHaveBeenCalled();
});

it("fails closed when allowance validation is unavailable", async () => {
  const { client, rpc, insert } = setup();
  rpc.mockRejectedValueOnce(new Error("Allowance unavailable"));
  await expect(saveUploadedProfileTrack(client, input)).rejects.toThrow("Allowance unavailable");
  expect(insert).not.toHaveBeenCalled();
});

it("does not impose Starter's five-song cap on paid artist access", async () => {
  const { client, rpc } = setup();
  rpc.mockResolvedValueOnce({ data: { limit: null, used: 5, remaining: null } as unknown as { limit: number; used: number; remaining: number }, error: null });
  await expect(checkSongUploadAllowance(client)).resolves.toBeUndefined();
});