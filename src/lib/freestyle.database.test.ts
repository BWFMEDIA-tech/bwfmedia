import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const db = new PGlite();
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const asUser = (n: number) => db.query("SELECT set_config('test.uid',$1,false)", [uid(n)]);
let battleId = '';
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $1 IN ('${uid(2)}'::uuid,'${uid(3)}'::uuid) $$;
    CREATE TABLE streams(id uuid PRIMARY KEY,host_id uuid,status text,room_name text);
    CREATE TABLE user_bans(user_id uuid,expires_at timestamptz);
    CREATE TABLE stage_participants(stream_id uuid,user_id uuid,stage_role text,allow_camera boolean);
    CREATE TABLE notifications(user_id uuid,type text,title text,body text,link text,actor_id uuid,stream_id uuid,source_event text,UNIQUE(user_id,source_event));
    CREATE PUBLICATION supabase_realtime;
    INSERT INTO streams VALUES('${uid(100)}','${uid(1)}','live','test-freestyle');
    INSERT INTO stage_participants VALUES('${uid(100)}','${uid(2)}','speaker',true),('${uid(100)}','${uid(3)}','speaker',true);`);
  await db.exec(readFileSync('drizzle/migrations/0054_freestyle_live_battles.sql', 'utf8'));
}, 30000);
afterAll(() => db.close());
describe.sequential('freestyle database rules', () => {
  it('only the stream owner can start', async () => {
    await asUser(2);
    await expect(db.query('SELECT start_freestyle_battle($1,$2,$3,180)', [uid(100),uid(2),uid(3)])).rejects.toThrow('Only the live stream owner');
  });
  it('requires approved camera access', async () => {
    await asUser(1);
    await db.exec(`UPDATE stage_participants SET allow_camera=false WHERE user_id='${uid(3)}'`);
    await expect(db.query('SELECT start_freestyle_battle($1,$2,$3,180)', [uid(100),uid(2),uid(3)])).rejects.toThrow('host-approved camera');
    await db.exec(`UPDATE stage_participants SET allow_camera=true WHERE user_id='${uid(3)}'`);
  });
  it('starts a separate battle and notifies both artists', async () => {
    const r = await db.query<{ id: string }>('SELECT start_freestyle_battle($1,$2,$3,180) AS id', [uid(100),uid(2),uid(3)]);
    battleId = r.rows[0].id;
    const n = await db.query<{ n: number }>("SELECT count(*)::int n FROM notifications WHERE type='battle_started'");
    expect(n.rows[0].n).toBe(2);
  });
  it('registered user can submit exactly one vote', async () => {
    await asUser(4);
    await db.query("SELECT cast_freestyle_vote($1,'a')", [battleId]);
    await expect(db.query("SELECT cast_freestyle_vote($1,'a')", [battleId])).rejects.toThrow('already voted');
    const result = await db.query<{ votes_a: number }>('SELECT votes_a FROM freestyle_battles WHERE id=$1', [battleId]);
    expect(result.rows[0].votes_a).toBe(1);
  });
  it('cannot vote for both artists', async () => {
    await expect(db.query("SELECT cast_freestyle_vote($1,'b')", [battleId])).rejects.toThrow('already voted');
  });
  it('unauthenticated callers cannot vote', async () => {
    await db.exec("SELECT set_config('test.uid','',false)");
    await expect(db.query("SELECT cast_freestyle_vote($1,'a')", [battleId])).rejects.toThrow('Sign in');
  });
  it('cannot finalize early', async () => {
    await db.query('SELECT finalize_freestyle_battle($1)', [battleId]);
    const r = await db.query<{status: string}>('SELECT status FROM freestyle_battles WHERE id=$1', [battleId]);
    expect(r.rows[0].status).toBe('live');
  });
  it('deadline closes voting even before finalization', async () => {
    await db.query("UPDATE freestyle_battles SET ends_at=clock_timestamp()-interval '1 second' WHERE id=$1", [battleId]);
    await asUser(5);
    const r = await db.query<{r: {ok: boolean}}>("SELECT cast_freestyle_vote($1,'b') r", [battleId]);
    expect(r.rows[0].r.ok).toBe(false);
  });
  it('validates winner and delivers both results once', async () => {
    await db.query('SELECT finalize_freestyle_battle($1)', [battleId]);
    await db.query('SELECT finalize_freestyle_battle($1)', [battleId]);
    const r = await db.query<{status:string;winner_id:string;votes_a:number;votes_b:number}>('SELECT * FROM freestyle_battles WHERE id=$1', [battleId]);
    expect(r.rows[0]).toMatchObject({status:'completed',winner_id:uid(2),votes_a:1,votes_b:0});
    const n = await db.query<{n:number}>("SELECT count(*)::int n FROM notifications WHERE type='battle_result'");
    expect(n.rows[0].n).toBe(2);
  });
  it('direct authenticated writes cannot bypass RPC voting', async () => {
    await asUser(6);
    await db.exec('SET ROLE authenticated');
    await expect(db.query("INSERT INTO public.freestyle_votes(battle_id,user_id,choice) VALUES($1,$2,'b')",[battleId,uid(6)])).rejects.toThrow('permission denied');
    await db.exec('RESET ROLE');
  });
});