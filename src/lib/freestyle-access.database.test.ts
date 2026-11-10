import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const db = new PGlite();
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE public.test_roles(user_id uuid, role text);
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM test_roles WHERE user_id=$1 AND role=$2) $$;
    CREATE TABLE public.streams(id uuid PRIMARY KEY,status text);
    CREATE TABLE public.freestyle_battles(id uuid PRIMARY KEY,stream_id uuid,host_id uuid,artist_a_id uuid,artist_b_id uuid,status text,started_at timestamptz,ends_at timestamptz,votes_a integer,votes_b integer,winner_id uuid);
    GRANT SELECT ON public.freestyle_battles TO authenticated;
    ALTER TABLE public.freestyle_battles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY freestyle_read ON public.freestyle_battles FOR SELECT TO authenticated USING(true);
    INSERT INTO test_roles VALUES('${uid(1)}','host'),('${uid(2)}','moderator'),('${uid(3)}','artist');
    INSERT INTO streams VALUES('${uid(100)}','live');
    INSERT INTO freestyle_battles VALUES('${uid(200)}','${uid(100)}','${uid(1)}','${uid(3)}','${uid(4)}','live',now(),now()+interval '3 minutes',0,0,null);`);
  await db.exec(readFileSync('drizzle/migrations/0063_restrict_freestyle_record_access.sql', 'utf8'));
}, 30000);
afterAll(() => db.close());
async function records(n: number) {
  await db.query("SELECT set_config('test.uid',$1,false)", [uid(n)]);
  await db.exec('SET ROLE authenticated');
  try { return (await db.query('SELECT id FROM public.freestyle_battles')).rows; }
  finally { await db.exec('RESET ROLE'); }
}
describe.sequential('freestyle record access', () => {
  it('allows hosts to read records', async () => { expect(await records(1)).toHaveLength(1); });
  it('allows moderators to read records', async () => { expect(await records(2)).toHaveLength(1); });
  it('hides records from ordinary signed-in members', async () => { expect(await records(5)).toHaveLength(0); });
  it('does not grant artists raw record access', async () => { expect(await records(3)).toHaveLength(0); });
  it('keeps limited live display available without exposing host/history', async () => {
    await records(5);
    await db.exec('SET ROLE authenticated');
    try {
      const { rows } = await db.query('SELECT * FROM get_freestyle_display($1)', [uid(100)]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: uid(200), artist_a_id: uid(3), artist_b_id: uid(4) });
      expect(rows[0]).not.toHaveProperty('host_id');
      expect(rows[0]).not.toHaveProperty('started_at');
    } finally { await db.exec('RESET ROLE'); }
  });
  it('does not expose display history after the stream ends', async () => {
    await db.exec("UPDATE streams SET status='ended'");
    await records(5);
    await db.exec('SET ROLE authenticated');
    try { expect((await db.query('SELECT * FROM get_freestyle_display($1)', [uid(100)])).rows).toHaveLength(0); }
    finally { await db.exec('RESET ROLE'); }
  });
});