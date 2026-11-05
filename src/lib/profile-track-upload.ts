import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type UploadedProfileTrack = { id: string; title: string; artist_name: string; cover_url: string | null };

export async function saveUploadedProfileTrack(client: SupabaseClient<Database>, track: {
  title: string; artistName: string; audioUrl: string; coverUrl: string | null; durationSeconds: number | null;
}): Promise<UploadedProfileTrack> {
  const { data: user, error: authError } = await client.auth.getUser();
  if (authError || !user.user) throw new Error("Sign in required");
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