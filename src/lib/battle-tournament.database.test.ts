import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const artist = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const migration = (name: string) => readFileSync(`drizzle/migrations/${name}.sql`, "utf8");
async function challenge(n: number, a = n * 2, b = n * 2 + 1, status = "accepted") {
  await db.query("INSERT INTO battle_challenges(id,challenger_id,challenged_id,genre,status) VALUES($1,$2,$3,'R&B',$4)", [artist(1000+n),artist(a),artist(b),status]);
}
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${artist(999)}'::uuid $$;
    CREATE TABLE battle_matches(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),stream_id uuid,host_id uuid,artist_a_id uuid,artist_b_id uuid,genre text,status text DEFAULT 'pending',genre_agreed_a boolean DEFAULT false,genre_agreed_b boolean DEFAULT false,winner_id uuid,ended_at timestamptz,active_side text);
    CREATE TABLE battle_challenges(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),challenger_id uuid,challenged_id uuid,genre text,status text DEFAULT 'pending',match_id uuid,stream_id uuid,scheduled_at timestamptz,updated_at timestamptz DEFAULT now());
    CREATE TABLE notifications(id uuid DEFAULT gen_random_uuid(),user_id uuid,type text,title text,body text,link text,actor_id uuid,stream_id uuid,source_event text,UNIQUE(user_id,source_event));
    CREATE TABLE matchmaking_pool(id uuid DEFAULT gen_random_uuid(),user_id uuid,tier text,xp_snapshot integer,status text,genre text,updated_at timestamptz);
    CREATE UNIQUE INDEX pool_waiting ON matchmaking_pool(user_id) WHERE status='waiting';
    CREATE FUNCTION get_user_xp(uuid) RETURNS integer LANGUAGE sql AS $$ SELECT 0 $$;
    CREATE FUNCTION get_user_rank(uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'bronze' $$;
    CREATE FUNCTION is_valid_battle_genre(text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;`);
  await db.exec(migration("0051_arena_tournament_rules"));
  await db.exec(migration("0052_tournament_guard_integrity"));
  await db.exec(migration("0053_tournament_notification_lifecycle"));
  await db.exec("CREATE TRIGGER sync_test AFTER UPDATE OF status ON battle_matches FOR EACH ROW EXECUTE FUNCTION battle_challenges_sync_match()");
}, 30000);
afterAll(async () => { await db.close(); });
describe.sequential("actual PostgreSQL tournament triggers", () => {
  it("reserves both artists and rejects any second opponent or reversed duplicate", async () => {
    await challenge(1,2,3,"pending");
    await expect(challenge(2,2,4,"pending")).rejects.toThrow("pending or active opponent");
    await expect(challenge(3,3,2,"pending")).rejects.toThrow("pending or active opponent");
    await db.exec(`UPDATE battle_challenges SET status='cancelled' WHERE id='${artist(1001)}'`);
  });
  it("fills 20 slots, rejects the 21st, and reopens after cancellation", async () => {
    for(let n=10;n<30;n++) await challenge(n);
    await expect(challenge(30)).rejects.toThrow("20 battle slots");
    await expect(challenge(31,62,63,"pending")).rejects.toThrow("20 battle slots");
    await db.exec(`UPDATE battle_challenges SET status='cancelled' WHERE id='${artist(1010)}'`);
    await challenge(30);
    const result = await db.query<{ count: number }>("SELECT battle_tournament_filled((SELECT id FROM battle_tournaments WHERE status='open')) AS count");
    expect(result.rows[0].count).toBe(20);
    await db.exec("UPDATE battle_challenges SET status='cancelled' WHERE status='accepted'");
  });
  it("accepted/scheduled notifications are atomic and deduplicated", async () => {
    await challenge(40,80,81,"pending");
    await db.exec(`UPDATE battle_challenges SET status='accepted' WHERE id='${artist(1040)}'; UPDATE battle_challenges SET status='scheduled',scheduled_at=now() WHERE id='${artist(1040)}';`);
    const result=await db.query<{ count:number }>("SELECT count(*)::int AS count FROM notifications WHERE source_event LIKE $1",[`battle-%:${artist(1040)}%`]);
    expect(result.rows[0].count).toBe(4);
  });
  it("launch reuses an accepted slot, completion frees it and eliminates only the loser", async () => {
    await db.exec(`INSERT INTO battle_matches(id,host_id,artist_a_id,artist_b_id,genre) VALUES('${artist(2040)}','${artist(999)}','${artist(80)}','${artist(81)}','R&B');
      UPDATE battle_challenges SET match_id='${artist(2040)}',status='live' WHERE id='${artist(1040)}';
      UPDATE battle_matches SET genre_agreed_a=true,genre_agreed_b=true,status='live' WHERE id='${artist(2040)}';
      UPDATE battle_matches SET status='completed',winner_id='${artist(80)}' WHERE id='${artist(2040)}';`);
    await expect(challenge(41,81,82)).rejects.toThrow("eliminated");
    await challenge(42,80,83);
    const result=await db.query<{ count:number }>("SELECT count(*)::int AS count FROM notifications WHERE source_event=$1",[`battle-result:${artist(2040)}`]);
    expect(result.rows[0].count).toBe(2);
    const loser=await db.query<{artist_id:string}>("SELECT artist_id FROM battle_tournament_eliminations");
    expect(loser.rows.map(r=>r.artist_id)).toEqual([artist(81)]);
    await db.exec(`UPDATE battle_challenges SET status='cancelled' WHERE id='${artist(1042)}'`);
  });
  it("only a host reset clears elimination for the next tournament", async () => {
    await db.exec(`SELECT set_config('test.uid','${artist(80)}',false)`);
    await expect(db.query("SELECT start_new_battle_tournament()")).rejects.toThrow("Only hosts");
    await db.exec(`SELECT set_config('test.uid','${artist(999)}',false); SELECT start_new_battle_tournament();`);
    await challenge(43,81,84);
  });
  it("counts direct agreed matches once and blocks cross-path selections", async () => {
    await db.exec(`INSERT INTO battle_matches(id,host_id,artist_a_id,artist_b_id,genre) VALUES('${artist(2050)}','${artist(999)}','${artist(100)}','${artist(101)}','R&B');
      UPDATE battle_matches SET genre_agreed_a=true,genre_agreed_b=true WHERE id='${artist(2050)}';`);
    await expect(challenge(51,100,102)).rejects.toThrow("pending or active opponent");
    const filled=await db.query<{count:number}>("SELECT battle_tournament_filled((SELECT id FROM battle_tournaments WHERE status='open')) AS count");
    expect(filled.rows[0].count).toBe(2);
    await db.exec(`UPDATE battle_matches SET status='cancelled' WHERE id='${artist(2050)}'`);
  });
  it("cancellation frees a linked direct match and neither artist loses eligibility", async () => {
    await db.exec(`INSERT INTO battle_matches(id,host_id,artist_a_id,artist_b_id,genre) VALUES('${artist(2060)}','${artist(999)}','${artist(120)}','${artist(121)}','R&B');
      INSERT INTO battle_challenges(id,challenger_id,challenged_id,genre,status,match_id) VALUES('${artist(1060)}','${artist(120)}','${artist(121)}','R&B','accepted','${artist(2060)}');
      UPDATE battle_challenges SET status='cancelled' WHERE id='${artist(1060)}';`);
    const match=await db.query<{status:string}>("SELECT status FROM battle_matches WHERE id=$1",[artist(2060)]);
    expect(match.rows[0].status).toBe("cancelled");
    await challenge(61,120,122);
  });
});