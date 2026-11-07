import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const db = new PGlite();
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const asUser = (n: number) => db.query("SELECT set_config('test.uid',$1,false)", [uid(n)]);
async function submit(a: number, b: number) {
  await asUser(a);
  const r = await db.query<{ id: string }>('SELECT submit_freestyle_challenge($1) id', [uid(b)]);
  return r.rows[0].id;
}
async function accept(id: string, b: number) { await asUser(b); await db.query('SELECT respond_freestyle_challenge($1,true)', [id]); }
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT CASE WHEN $2='artist' THEN $1<> '${uid(1)}'::uuid WHEN $2='host' THEN $1='${uid(1)}'::uuid WHEN $2='admin' THEN $1='${uid(99)}'::uuid ELSE false END $$;
    CREATE TABLE streams(id uuid PRIMARY KEY,host_id uuid,status text,room_name text);
    CREATE TABLE user_bans(user_id uuid,expires_at timestamptz);
    CREATE TABLE stage_participants(stream_id uuid,user_id uuid,stage_role text,allow_camera boolean);
    CREATE TABLE notifications(user_id uuid,type text,title text,body text,link text,actor_id uuid,stream_id uuid,source_event text,UNIQUE(user_id,source_event));
    CREATE PUBLICATION supabase_realtime;
    INSERT INTO streams VALUES('${uid(100)}','${uid(1)}','live','test-freestyle');
    INSERT INTO stage_participants VALUES('${uid(100)}','${uid(2)}','speaker',true),('${uid(100)}','${uid(3)}','speaker',true);`);
  for (const file of ['0054_freestyle_live_battles.sql','0056_freestyle_ten_slot_challenge_queue.sql','0057_freestyle_authorized_queue_launch.sql']) await db.exec(readFileSync(`drizzle/migrations/${file}`, 'utf8'));
}, 30000);
afterAll(() => db.close());
let first = '';
describe.sequential('10-slot freestyle queue database rules', () => {
  it('rejects self challenges', async () => { await expect(submit(2,2)).rejects.toThrow('Select another artist'); });
  it('requires eligible artists', async () => { await expect(submit(1,2)).rejects.toThrow('eligible artists'); });
  it('notifies the invited artist instantly and pending has no slot', async () => {
    first = await submit(2,3);
    const c = await db.query<{status:string;slot_number:number|null}>('SELECT status,slot_number FROM freestyle_challenges WHERE id=$1',[first]);
    expect(c.rows[0]).toEqual({status:'pending',slot_number:null});
    const n=await db.query<{n:number}>('SELECT count(*)::int n FROM notifications WHERE user_id=$1',[uid(3)]); expect(n.rows[0].n).toBe(1);
  });
  it('one pending or active challenge per artist prevents duplicates and reverse challenges', async () => {
    await expect(submit(2,4)).rejects.toThrow('only one');
    await expect(submit(4,3)).rejects.toThrow('only one');
    await expect(submit(3,2)).rejects.toThrow('only one');
  });
  it('only recipient may accept', async () => { await expect(accept(first,2)).rejects.toThrow('invited artist'); });
  it('acceptance assigns next slot and notifies both artists', async () => {
    await accept(first,3);
    const c=await db.query<{status:string;slot_number:number}>('SELECT status,slot_number FROM freestyle_challenges WHERE id=$1',[first]); expect(c.rows[0]).toEqual({status:'accepted',slot_number:1});
    const n=await db.query<{n:number}>("SELECT count(*)::int n FROM notifications WHERE title='TUNEVIO Freestyle Challenge Accepted'"); expect(n.rows[0].n).toBe(2);
  });
  it('unaccepted matchups cannot start and artists cannot launch themselves', async () => {
    await asUser(1); await expect(db.query('SELECT start_freestyle_battle($1,$2,$3,180)',[uid(100),uid(3),uid(2)])).rejects.toThrow('accepted freestyle matchup');
    await asUser(2); await expect(db.query('SELECT start_freestyle_battle($1,$2,$3,180)',[uid(100),uid(2),uid(3)])).rejects.toThrow('authorized host');
  });
  it('only authorized host can schedule', async () => {
    await asUser(4); await expect(db.query("SELECT control_freestyle_challenge($1,'schedule',$2,now()+interval '1 hour')",[first,uid(100)])).rejects.toThrow('authorized host');
    await asUser(1); await db.query("SELECT control_freestyle_challenge($1,'schedule',$2,now()+interval '1 hour')",[first,uid(100)]);
    const r=await db.query<{status:string}>('SELECT status FROM freestyle_challenges WHERE id=$1',[first]); expect(r.rows[0].status).toBe('scheduled');
  });
  it('host start preserves assigned A/B and end validates votes and releases slot', async () => {
    await asUser(1); const r=await db.query<{id:string}>('SELECT start_freestyle_battle($1,$2,$3,180) id',[uid(100),uid(2),uid(3)]);
    const id=r.rows[0].id;
    await asUser(4); await db.query("SELECT cast_freestyle_vote($1,'a')",[id]);
    await expect(db.query('SELECT end_freestyle_battle($1)',[id])).rejects.toThrow('authorized host');
    await asUser(1); await db.query('SELECT end_freestyle_battle($1)',[id]);
    const b=await db.query<{winner_id:string;artist_a_id:string;artist_b_id:string}>('SELECT winner_id,artist_a_id,artist_b_id FROM freestyle_battles WHERE id=$1',[id]); expect(b.rows[0]).toEqual({winner_id:uid(2),artist_a_id:uid(2),artist_b_id:uid(3)});
    const c=await db.query<{status:string}>('SELECT status FROM freestyle_challenges WHERE id=$1',[first]); expect(c.rows[0].status).toBe('completed');
  });
  it('decline releases opponent locks and notifies challenger', async () => {
    const id=await submit(2,3); await asUser(3); await db.query('SELECT respond_freestyle_challenge($1,false)',[id]);
    const n=await db.query<{n:number}>("SELECT count(*)::int n FROM notifications WHERE user_id=$1 AND title='TUNEVIO Freestyle Challenge Declined'",[uid(2)]); expect(n.rows[0].n).toBe(1);
  });
  it('exactly 10 confirmed slots; eleventh acceptance rejected and cancellation reopens a slot', async () => {
    const pending=await submit(40,41);
    const ids: string[]=[];
    for(let i=0;i<10;i++){ const a=10+i*2; const id=await submit(a,a+1); await accept(id,a+1); ids.push(id); }
    await expect(accept(pending,41)).rejects.toThrow('All 10'); await expect(submit(50,51)).rejects.toThrow('All 10');
    const count=await db.query<{n:number}>("SELECT count(*)::int n FROM freestyle_challenges WHERE status='accepted'"); expect(count.rows[0].n).toBe(10);
    await asUser(10); await db.query("SELECT control_freestyle_challenge($1,'cancel')",[ids[0]]); await accept(pending,41);
    const slot=await db.query<{slot_number:number}>('SELECT slot_number FROM freestyle_challenges WHERE id=$1',[pending]); expect(slot.rows[0].slot_number).toBe(1);
  });
  it('direct authenticated writes cannot bypass queue RPCs', async () => {
    await db.exec('SET ROLE authenticated');
    await expect(db.query('INSERT INTO freestyle_challenges(artist_a_id,artist_b_id) VALUES($1,$2)',[uid(60),uid(61)])).rejects.toThrow('permission denied');
    await db.exec('RESET ROLE');
  });
});