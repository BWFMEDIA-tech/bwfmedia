import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function actor(n: number | null, role = 'authenticated') {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('test.uid',$1,false)", [n === null ? '' : id(n)]);
  await db.exec(`SET ROLE ${role}`);
}
beforeAll(async () => {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${id(3)}'::uuid AND $2='admin' $$;
    CREATE TABLE subscriptions(user_id uuid,plan_type text,price_id text,status text,current_period_end timestamptz);
    CREATE TABLE play_tracks(id uuid PRIMARY KEY,artist_user_id uuid,title text,cover_url text);
    CREATE TABLE stream_events(id uuid PRIMARY KEY,artist_id uuid,track_id uuid,user_id uuid,created_at timestamptz,duration_played_seconds integer,full_listen boolean,liked boolean,saved boolean,shared boolean,metadata jsonb,valid_stream boolean);
    INSERT INTO subscriptions VALUES
      ('${id(2)}','artist_pro',null,'active',now()+interval '30 days'),
      ('${id(4)}','label_plan',null,'active',now()+interval '30 days'),
      ('${id(5)}','artist_pro',null,'canceled',now()+interval '1 day'),
      ('${id(6)}','artist_pro',null,'canceled',now()-interval '1 day'),
      ('${id(7)}','student',null,'active',now()+interval '30 days');
    INSERT INTO play_tracks VALUES('${id(100)}','${id(2)}','Owned song',null),('${id(101)}','${id(4)}','Other artist song',null);
    INSERT INTO stream_events VALUES
      ('${id(200)}','${id(2)}','${id(100)}','${id(1)}',now(),30,false,false,false,false,'{"country":"US"}',true),
      ('${id(201)}','${id(4)}','${id(101)}','${id(1)}',now(),30,false,false,false,false,'{"country":"CA"}',true),
      ('${id(202)}','${id(2)}','${id(100)}','${id(1)}',now(),2,false,false,false,false,'{}',false);`);
  const entitlement = readFileSync('drizzle/migrations/0088_add_pay_what_you_want_music_store.sql', 'utf8').match(/CREATE OR REPLACE FUNCTION public\.has_entitlement[\s\S]*?\$function\$;/)?.[0];
  if (!entitlement) throw new Error('Missing entitlement function');
  await db.exec(entitlement);
  await db.exec(readFileSync('drizzle/migrations/0013_add_artist_streaming_analytics.sql', 'utf8'));
  await db.exec(readFileSync('drizzle/migrations/0101_enforce_streaming_analytics_entitlement.sql', 'utf8'));
}, 30000);
afterAll(() => db.close());
const analytics = () => db.query<{ result: { summary: { totalStreams: number }; tracks: Array<{ id: string }> } }>('SELECT get_my_streaming_analytics(30) AS result');
describe.sequential('direct streaming analytics authorization', () => {
  it('denies anonymous RPC access', async () => { await actor(null,'anon'); await expect(analytics()).rejects.toThrow('permission denied'); });
  it('denies a newly registered account with no subscription', async () => { await actor(1); await expect(analytics()).rejects.toThrow('Artist Pro or Label Plan required'); });
  it('denies paid listener plans advanced artist analytics', async () => { await actor(7); await expect(analytics()).rejects.toThrow('Artist Pro or Label Plan required'); });
  it('Artist Pro sees only its own valid streams and songs', async () => {
    await actor(2); const result = (await analytics()).rows[0]?.result;
    expect(result?.summary.totalStreams).toBe(1);
    expect(result?.tracks.map(t => t.id)).toEqual([id(100)]);
  });
  it('Label Plan retains its own analytics', async () => { await actor(4); expect((await analytics()).rows[0]?.result.summary.totalStreams).toBe(1); });
  it('admins retain access without exposing another artist through self analytics', async () => { await actor(3); expect((await analytics()).rows[0]?.result.summary.totalStreams).toBe(0); });
  it('cancellation retains access through the paid period', async () => { await actor(5); await expect(analytics()).resolves.toBeDefined(); });
  it('expired cancellation cannot bypass the paid gate', async () => { await actor(6); await expect(analytics()).rejects.toThrow('Artist Pro or Label Plan required'); });
});