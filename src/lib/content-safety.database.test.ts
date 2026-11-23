import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const db = new PGlite();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function asUser(n: number) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('test.uid',$1,false)", [id(n)]);
  await db.exec('SET ROLE authenticated');
}
beforeAll(async () => {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE anon;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${id(3)}'::uuid AND $2='admin' $$;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY,display_name text);
    CREATE VIEW public.public_profiles AS SELECT * FROM public.profiles;
    GRANT SELECT ON public.public_profiles TO authenticated;
    CREATE TABLE public.direct_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_id uuid,recipient_id uuid,body text);
    GRANT SELECT,INSERT ON public.direct_messages TO authenticated;
    ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY dm_read ON public.direct_messages FOR SELECT TO authenticated USING(auth.uid() IN(sender_id,recipient_id));
    CREATE POLICY dm_write ON public.direct_messages FOR INSERT TO authenticated WITH CHECK(auth.uid()=sender_id);
    CREATE TABLE public.stream_messages(id uuid PRIMARY KEY,stream_id uuid,user_id uuid,body text);
    GRANT SELECT ON public.stream_messages TO authenticated;
    ALTER TABLE public.stream_messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY chat_read ON public.stream_messages FOR SELECT TO authenticated USING(true);
    CREATE TABLE public.play_tracks(id uuid PRIMARY KEY,artist_user_id uuid,title text);
    CREATE TABLE public.streams(id uuid PRIMARY KEY,host_id uuid,title text);
    GRANT SELECT ON public.play_tracks,public.streams TO authenticated;
    INSERT INTO public.profiles VALUES('${id(1)}','Reporter'),('${id(2)}','Other member'),('${id(3)}','Admin'),('${id(4)}','Unrelated member');
    INSERT INTO public.play_tracks VALUES('${id(100)}','${id(2)}','Real song');
    INSERT INTO public.streams VALUES('${id(101)}','${id(2)}','Real stage');`);
  await db.exec(readFileSync('drizzle/migrations/0071_personal_blocks_and_content_reports.sql', 'utf8'));
  await db.exec(readFileSync('drizzle/migrations/0072_report_owner_capture_and_account_cleanup.sql', 'utf8'));
}, 30000);
beforeEach(async () => {
  await db.exec('RESET ROLE');
  await db.exec('DELETE FROM public.moderation_reports; DELETE FROM public.user_blocks; DELETE FROM public.direct_messages; DELETE FROM public.stream_messages;');
  await db.query('INSERT INTO public.direct_messages(id,sender_id,recipient_id,body) VALUES($1,$2,$3,$4)', [id(200),id(2),id(1),'Original private message']);
  await db.query('INSERT INTO public.stream_messages VALUES($1,$2,$3,$4)', [id(201),id(101),id(2),'Original live comment']);
  await asUser(1);
});
afterAll(() => db.close());
const blockOther = () => db.query('INSERT INTO public.user_blocks(blocked_id) VALUES($1)', [id(2)]);
const send = (sender: number, recipient: number) => db.query("INSERT INTO public.direct_messages(sender_id,recipient_id,body) VALUES($1,$2,'Hello')", [id(sender),id(recipient)]);
const report = (type = 'direct_message', target = id(200)) => db.query<{id:string}>("INSERT INTO public.moderation_reports(target_type,target_id,category,evidence) VALUES($1,$2,'harassment','Forged evidence') RETURNING id", [type,target]);

describe.sequential('personal safety database rules', () => {
  it('prevents a user from blocking themselves', async () => {
    await expect(db.query('INSERT INTO public.user_blocks(blocked_id) VALUES($1)', [id(1)])).rejects.toThrow('user_blocks_not_self');
  });
  it('does not allow creating a block for another user', async () => {
    await expect(db.query('INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2)', [id(4),id(2)])).rejects.toThrow('row-level security');
  });
  it('keeps personal blocks private from unrelated members', async () => {
    await blockOther(); await asUser(4);
    expect((await db.query('SELECT * FROM public.user_blocks')).rows).toHaveLength(0);
  });
  it('prevents the blocked person sending new private messages', async () => {
    await blockOther(); await asUser(2);
    await expect(send(2,1)).rejects.toThrow('Messaging is unavailable');
  });
  it('prevents the blocker sending new private messages', async () => {
    await blockOther(); await expect(send(1,2)).rejects.toThrow('Messaging is unavailable');
  });
  it('restores private messaging after unblocking', async () => {
    await blockOther(); await db.query('DELETE FROM public.user_blocks WHERE blocked_id=$1', [id(2)]);
    await expect(send(1,2)).resolves.toBeDefined();
  });
  it('does not prevent messaging unrelated members', async () => {
    await blockOther(); await expect(send(1,4)).resolves.toBeDefined();
  });
  it('hides blocked live comments only for the blocker', async () => {
    await blockOther(); expect((await db.query('SELECT * FROM public.stream_messages')).rows).toHaveLength(0);
    await asUser(4); expect((await db.query('SELECT * FROM public.stream_messages')).rows).toHaveLength(1);
  });
  it('captures real evidence rather than accepting invented message text', async () => {
    await report();
    expect((await db.query('SELECT evidence,target_user_id FROM public.moderation_reports')).rows[0]).toEqual({evidence:'Original private message',target_user_id:id(2)});
  });
  it('cannot report another pair’s private messages', async () => {
    await asUser(4); await expect(report()).rejects.toThrow('unavailable for reporting');
  });
  it('rejects nonexistent content', async () => {
    await expect(report('profile',id(999))).rejects.toThrow('unavailable for reporting');
  });
  it('prevents duplicate unresolved reports', async () => {
    await report(); await expect(report()).rejects.toThrow('already reported');
  });
  it('keeps reports private from unrelated members', async () => {
    await report(); await asUser(4); expect((await db.query('SELECT * FROM public.moderation_reports')).rows).toHaveLength(0);
  });
  it('prevents reporters granting themselves resolved status', async () => {
    await expect(db.query("INSERT INTO public.moderation_reports(target_type,target_id,category,status) VALUES('profile',$1,'spam','resolved')", [id(2)])).rejects.toThrow('row-level security');
  });
  it('prevents a member from reviewing reports', async () => {
    await report(); const updated = await db.query("UPDATE public.moderation_reports SET status='resolved' RETURNING id");
    expect(updated.rows).toHaveLength(0);
  });
  it('allows admin review and records the actual reviewer', async () => {
    await report(); await asUser(3);
    const result = await db.query<{status:string; reviewed_by:string; reviewed_at:string}>("UPDATE public.moderation_reports SET status='reviewing',review_note='Review begun' RETURNING status,reviewed_by,reviewed_at");
    expect(result.rows[0]).toMatchObject({status:'reviewing',reviewed_by:id(3)});
    expect(result.rows[0]?.['reviewed_at']).toBeTruthy();
  });
  it('does not allow admins to rewrite report evidence', async () => {
    await report(); await asUser(3);
    await expect(db.query("UPDATE public.moderation_reports SET evidence='Changed'")).rejects.toThrow('permission denied');
  });
  it('captures the music artist account and real title', async () => {
    await report('track',id(100));
    expect((await db.query('SELECT evidence,target_user_id FROM public.moderation_reports')).rows[0]).toEqual({evidence:'Real song',target_user_id:id(2)});
  });
  it('limits submissions to ten per hour', async () => {
    await db.exec('RESET ROLE');
    for (let i=0;i<11;i++) await db.query('INSERT INTO public.play_tracks VALUES($1,$2,$3)', [id(300+i),id(2),`Song ${i}`]);
    await asUser(1);
    for (let i=0;i<10;i++) await report('track',id(300+i));
    await expect(report('track',id(310))).rejects.toThrow('Report limit reached');
  });
  it('cleans personal safety data on permanent profile deletion', async () => {
    await report(); await blockOther(); await db.exec('RESET ROLE');
    await db.query('DELETE FROM public.profiles WHERE id=$1', [id(2)]);
    expect((await db.query('SELECT * FROM public.moderation_reports')).rows).toHaveLength(0);
    expect((await db.query('SELECT * FROM public.user_blocks')).rows).toHaveLength(0);
  });
});