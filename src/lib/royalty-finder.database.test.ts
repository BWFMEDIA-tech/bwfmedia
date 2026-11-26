import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const db = new PGlite();
const owner = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002';
const track = '00000000-0000-4000-8000-000000000011';
let scanId = '';
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $2='artist' $$;
    CREATE TABLE play_tracks(id uuid PRIMARY KEY,artist_user_id uuid);
    INSERT INTO play_tracks VALUES('${track}','${owner}');`);
  await db.exec(readFileSync('drizzle/migrations/0086_royalty_finder_history.sql', 'utf8'));
  await db.exec(readFileSync('drizzle/migrations/0087_royalty_scan_input_guards.sql', 'utf8'));
}, 30000);
afterAll(() => db.close());
async function asUser(user: string, query: string) {
  await db.query("SELECT set_config('test.uid',$1,false)", [user]);
  await db.exec('SET ROLE authenticated');
  try { return (await db.query<Record<string, unknown>>(query)).rows; } finally { await db.exec('RESET ROLE'); }
}
describe.sequential('private Royalty Finder', () => {
  it('saves an owned scan and findings atomically', async () => {
    const findings = JSON.stringify([{ track_id: track, song_title: 'My Song', artist_name: 'Artist', organization: 'mlc', issue_type: 'Missing writer', evidence: 'No writer saved', recommended_action: 'Add writer' }]);
    const result = await asUser(owner, `SELECT save_royalty_catalog_scan(ARRAY['${track}'::uuid],'${findings}'::jsonb,'[]'::jsonb) AS id`);
    scanId = String(result[0]?.['id']);
    expect(await asUser(owner, 'SELECT song_title,match_confidence FROM royalty_scan_findings')).toEqual([{ song_title: 'My Song', match_confidence: null }]);
  });
  it('hides scans and findings from another artist', async () => {
    expect(await asUser(other, 'SELECT id FROM royalty_catalog_scans')).toEqual([]);
    expect(await asUser(other, 'SELECT id FROM royalty_scan_findings')).toEqual([]);
  });
  it('allows resolution without verification', async () => {
    await asUser(owner, 'UPDATE royalty_scan_findings SET resolved=true');
    expect(await asUser(owner, 'SELECT resolved,resolved_at IS NOT NULL AS timestamped FROM royalty_scan_findings')).toEqual([{ resolved: true, timestamped: true }]);
  });
  it('does not grant evidence edits', async () => {
    await expect(asUser(owner, "UPDATE royalty_scan_findings SET evidence='fabricated'" )).rejects.toThrow(/permission denied/);
  });
  it('does not accept another artist catalog', async () => {
    await expect(asUser(other, `SELECT save_royalty_catalog_scan(ARRAY['${track}'::uuid],'[]','[]')`)).rejects.toThrow(/ownership/);
  });
  it('rejects null track arrays', async () => {
    await expect(asUser(owner, "SELECT save_royalty_catalog_scan(NULL,'[]','[]')")).rejects.toThrow(/Invalid scan input/);
  });
  it('does not allow another artist to resolve a finding', async () => {
    await asUser(other, `UPDATE royalty_scan_findings SET resolved=false WHERE scan_id='${scanId}'`);
    expect(await asUser(owner, 'SELECT resolved FROM royalty_scan_findings')).toEqual([{ resolved: true }]);
  });
});