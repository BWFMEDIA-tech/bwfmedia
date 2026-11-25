import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const db = new PGlite();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${id(1)}'::uuid AND $2='admin' $$;
    CREATE TABLE streams(id uuid PRIMARY KEY,host_id uuid,status text);
    CREATE TABLE stream_moderators(stream_id uuid,user_id uuid);
    GRANT SELECT ON streams TO authenticated;
    GRANT SELECT ON stream_moderators TO authenticated,anon;
    ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
    ALTER TABLE stream_moderators ENABLE ROW LEVEL SECURITY;
    CREATE POLICY streams_scoped_read ON streams FOR SELECT TO authenticated USING(status IN ('live','idle','scheduled') OR host_id=auth.uid() OR has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM stream_moderators m WHERE m.stream_id=streams.id AND m.user_id=auth.uid()));
    CREATE POLICY moderator_read ON stream_moderators FOR SELECT TO authenticated,anon USING(EXISTS(SELECT 1 FROM streams s WHERE s.id=stream_moderators.stream_id AND (s.status='live' OR s.host_id=auth.uid())));
    INSERT INTO streams VALUES('${id(101)}','${id(2)}','live'),('${id(102)}','${id(2)}','ended'),('${id(103)}','${id(4)}','ended');
    INSERT INTO stream_moderators VALUES('${id(101)}','${id(3)}'),('${id(102)}','${id(3)}');`);
  await db.exec(readFileSync('drizzle/migrations/0084_break_stream_read_policy_recursion.sql', 'utf8'));
}, 30000);
afterAll(() => db.close());
async function asUser(n: number, query: string, role = 'authenticated') {
  await db.query("SELECT set_config('test.uid',$1,false)", [n ? id(n) : '']);
  await db.exec(`SET ROLE ${role}`);
  try { return (await db.query(query)).rows; }
  finally { await db.exec('RESET ROLE'); }
}
describe.sequential('stream read policy recursion', () => {
  it('ordinary signed-in visitors read live streams without recursion and cannot read ended rooms', async () => {
    expect(await asUser(5, 'SELECT id FROM streams ORDER BY id')).toEqual([{ id: id(101) }]);
  });
  it('hosts retain access to their own ended rooms', async () => {
    expect(await asUser(2, 'SELECT id FROM streams ORDER BY id')).toEqual([{ id: id(101) }, { id: id(102) }]);
  });
  it('assigned moderators retain scoped stream access without exposing unrelated ended rooms', async () => {
    expect(await asUser(3, 'SELECT id FROM streams ORDER BY id')).toEqual([{ id: id(101) }, { id: id(102) }]);
  });
  it('administrators retain access to all streams', async () => {
    expect(await asUser(1, 'SELECT id FROM streams ORDER BY id')).toEqual([{ id: id(101) }, { id: id(102) }, { id: id(103) }]);
  });
  it('Studio and profile moderator-list reads retain live-only visibility for visitors', async () => {
    expect(await asUser(5, 'SELECT stream_id FROM stream_moderators ORDER BY stream_id')).toEqual([{ stream_id: id(101) }]);
  });
  it('owners can still read their own moderator lists after a stream ends', async () => {
    expect(await asUser(2, 'SELECT stream_id FROM stream_moderators ORDER BY stream_id')).toEqual([{ stream_id: id(101) }, { stream_id: id(102) }]);
  });
  it('the helper checks only the current identity', async () => {
    expect(await asUser(5, `SELECT is_current_stream_moderator('${id(102)}') AS allowed`)).toEqual([{ allowed: false }]);
    expect(await asUser(3, `SELECT is_current_stream_moderator('${id(102)}') AS allowed`)).toEqual([{ allowed: true }]);
  });
  it('guests cannot execute the assignment helper', async () => {
    await expect(asUser(0, `SELECT is_current_stream_moderator('${id(101)}')`, 'anon')).rejects.toThrow(/permission denied/);
  });
});