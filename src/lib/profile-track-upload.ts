import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type UploadedProfileTrack = { id: string; title: string; artist_name: string; cover_url: string | null };

export const STARTER_SONG_LIMIT_MESSAGE = "You've reached your 5-song upload limit. Upgrade your plan to upload more music.";

export async function checkSongUploadAllowance(client: SupabaseClient<Database>): Promise<void> {
  const { data, error } = await client.rpc("get_song_upload_allowance");
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data) || !("remaining" in data)) {
    throw new Error("Unable to check your song upload allowance. Please try again.");
  }
  if (data.remaining === 0) throw new Error(STARTER_SONG_LIMIT_MESSAGE);
}

export async function saveUploadedProfileTrack(client: SupabaseClient<Database>, track: {
  title: string; artistName: string; audioUrl: string; coverUrl: string | null; durationSeconds: number | null;
}): Promise<UploadedProfileTrack> {
  const { data: user, error: authError } = await client.auth.getUser();
  if (authError || !user.user) throw new Error("Sign in required");
  await checkSongUploadAllowance(client);
  const { data: streamId, error: libraryError } = await client.rpc("get_or_create_profile_stream");
  if (libraryError) throw libraryError;
  if (!streamId) throw new Error("Unable to save to your profile");
  const { data: saved, error } = await client.from("play_tracks").insert({
    stream_id: streamId,
    artist_user_id: user.user.id,
    artist_name: track.artistName.trim(),
    title: track.title.trim(),
    audio_url: track.audioUrl,
    cover_url: track.coverUrl,
    duration_seconds: track.durationSeconds,
    status: "queued",
  }).select("id, title, artist_name, cover_url").single();
  if (error) throw error;
  if (!saved) throw new Error("Unable to save to your profile");
  return saved;
}