import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const db = new PGlite();
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE public.test_roles(user_id uuid, role text);
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM test_roles WHERE user_id=$1 AND role=$2) $$;
    CREATE TABLE public.artist_referral_settings(id boolean PRIMARY KEY, percentage numeric, enabled boolean, updated_by uuid, updated_at timestamptz);
    GRANT SELECT ON public.artist_referral_settings TO anon, authenticated;
    ALTER TABLE public.artist_referral_settings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Anyone reads referral settings" ON public.artist_referral_settings FOR SELECT TO anon, authenticated USING(true);
    INSERT INTO test_roles VALUES('${uid(1)}','admin'),('${uid(2)}','host');
    INSERT INTO artist_referral_settings VALUES(true,12.5,true,'${uid(1)}',now());`);
  await db.exec(readFileSync('drizzle/migrations/0077_private_artist_referral_settings.sql', 'utf8'));
}, 30000);
afterAll(() => db.close());
async function asUser(n: number, query: string, role = 'authenticated') {
  await db.query("SELECT set_config('test.uid',$1,false)", [n ? uid(n) : '']);
  await db.exec(`SET ROLE ${role}`);
  try { return (await db.query(query)).rows; }
  finally { await db.exec('RESET ROLE'); }
}
describe.sequential('referral administration privacy', () => {
  it('keeps administrator details visible to administrators', async () => {
    expect(await asUser(1, 'SELECT updated_by FROM artist_referral_settings')).toEqual([{ updated_by: uid(1) }]);
  });
  it('hides administration records from hosts', async () => {
    expect(await asUser(2, 'SELECT * FROM artist_referral_settings')).toEqual([]);
  });
  it('gives hosts only the existing percentage and enabled status', async () => {
    expect(await asUser(2, 'SELECT * FROM get_my_artist_referral_settings()')).toEqual([{ percentage: '12.5', enabled: true }]);
  });
  it('hides referral settings from ordinary members', async () => {
    expect(await asUser(3, 'SELECT * FROM artist_referral_settings')).toEqual([]);
    expect(await asUser(3, 'SELECT * FROM get_my_artist_referral_settings()')).toEqual([]);
  });
  it('denies guests both raw records and the host-only reader', async () => {
    await expect(asUser(0, 'SELECT * FROM artist_referral_settings', 'anon')).rejects.toThrow(/permission denied/);
    await expect(asUser(0, 'SELECT * FROM get_my_artist_referral_settings()', 'anon')).rejects.toThrow(/permission denied/);
  });
});