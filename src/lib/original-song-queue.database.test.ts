import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const uid = "00000000-0000-4000-8000-000000000001";
const library = "00000000-0000-4000-8000-000000000002";
const arena = "00000000-0000-4000-8000-000000000003";
const original = "00000000-0000-4000-8000-000000000004";
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE TABLE streams(id uuid PRIMARY KEY,title text);
    CREATE TABLE play_tracks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),artist_user_id uuid,stream_id uuid,title text,audio_url text,status text,created_at timestamptz DEFAULT now());
    INSERT INTO streams VALUES('${library}','__profile_library__'),('${arena}','Arena');
    INSERT INTO play_tracks(id,artist_user_id,stream_id,title,audio_url,status) VALUES('${original}','${uid}','${library}','Where I Come From','/storage/v1/object/sign/artist-audio/play/${uid}/song.mp3?token=old','queued');`);
  await db.exec(readFileSync("drizzle/migrations/0099_link_original_songs_and_guard_arena_duplicates.sql", "utf8"));
  await db.exec(readFileSync("drizzle/migrations/0100_preserve_original_song_deletion_behavior.sql", "utf8"));
}, 30000);
afterAll(() => db.close());

it("links Arena playback to the original song ID and preserves audio", async () => {
  const result = await db.query(`INSERT INTO play_tracks(artist_user_id,stream_id,title,audio_url,status,source_track_id) VALUES('${uid}','${arena}','Where I Come From','/storage/v1/object/sign/artist-audio/play/${uid}/song.mp3?token=new','queued','${original}') RETURNING source_track_id,audio_url`);
  expect(result.rows).toEqual([{source_track_id: original,audio_url:`/storage/v1/object/sign/artist-audio/play/${uid}/song.mp3?token=new`}]);
});
it("rejects a second active submission even with a refreshed audio token", async () => {
  await expect(db.exec(`INSERT INTO play_tracks(artist_user_id,stream_id,title,audio_url,status) VALUES('${uid}','${arena}','Where I Come From','/storage/v1/object/sign/artist-audio/play/${uid}/song.mp3?token=third','queued')`)).rejects.toThrow("already in the live queue");
});
it("preserves submission history and allows another submission after completion", async () => {
  await db.exec(`UPDATE play_tracks SET status='completed' WHERE stream_id='${arena}'; INSERT INTO play_tracks(artist_user_id,stream_id,title,audio_url,status) VALUES('${uid}','${arena}','Where I Come From','/storage/v1/object/sign/artist-audio/play/${uid}/song.mp3?token=fourth','queued')`);
  expect((await db.query("SELECT count(*)::int AS total FROM play_tracks")).rows).toEqual([{total:3}]);
});
it("rejects links to another artist's recording", async () => {
  await expect(db.exec(`INSERT INTO play_tracks(artist_user_id,stream_id,title,audio_url,status,source_track_id) VALUES('00000000-0000-4000-8000-000000000009','${arena}','Other song','/artist-audio/play/other/song.mp3','queued','${original}')`)).rejects.toThrow("already on your artist profile");
});