import { expect, it, vi } from "vitest";
import { saveUploadedProfileTrack } from "./profile-track-upload";

function setup(error: Error | null = null) {
  const saved = { id: "saved-profile-song", title: "New song", artist_name: "Artist", cover_url: "cover" };
  const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: error ? null : saved, error }) }) }));
  const rpc = vi.fn(async () => ({ data: "owner-profile-library", error: null }));
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