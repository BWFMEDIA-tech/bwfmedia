import { beforeEach, describe, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ publicMatch: null as any, privateMatch: null as any, calls: [] as string[], error: null as any }));
vi.mock('@tanstack/react-start', () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return { createServerFn: () => builder };
});
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
function reader(match: any, scope: string) {
  return { from: () => {
    f.calls.push(scope);
    const q: any = {};
    for (const op of ['select','eq','in','order','limit']) q[op] = () => q;
    q.maybeSingle = async () => ({ data:match,error:f.error });
    return q;
  } };
}
vi.mock('@/lib/public-db.server', () => ({ createPublicDb: () => reader(f.publicMatch,'public') }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: {
  from: (table: string) => {
    f.calls.push('admin:'+table); const q: any = {};
    for (const op of ['select','eq','in','order','limit']) q[op] = () => q;
    q.then = (resolve: (value: unknown) => unknown) => Promise.resolve({data:[],error:null}).then(resolve);
    return q;
  },
} }));
import { getBattleRoomState, getMyBattleRoomState } from './battle-engine.functions';
const publicLoad = getBattleRoomState as unknown as (x:any)=>Promise<any>;
const privateLoad = getMyBattleRoomState as unknown as (x:any)=>Promise<any>;
beforeEach(() => { f.calls=[]; f.publicMatch=null; f.error=null; });
describe('battle room snapshot privacy', () => {
  it('public private-match lookup returns empty without any privileged data reads', async () => {
    const state=await publicLoad({data:{streamId:'private-stream'}});
    expect(state.match).toBeNull(); expect(f.calls).toEqual(['public']);
  });
  it('public live battle still returns its authorized snapshot', async () => {
    f.publicMatch={id:'live',status:'live',current_round_id:null,active_side:null};
    const state=await publicLoad({data:{streamId:'live-stream'}});
    expect(state.match.id).toBe('live'); expect(f.calls).toEqual(['public','public']);
  });
  it('authorized host retains pending battle preparation', async () => {
    const match={id:'pending',status:'pending',current_round_id:null,active_side:null};
    const state=await privateLoad({data:{streamId:'private-stream'},context:{supabase:reader(match,'host')}});
    expect(state.match.id).toBe('pending'); expect(f.calls).toEqual(['host','host']);
  });
  it('unrelated signed-in caller does not gain private snapshot access', async () => {
    const state=await privateLoad({data:{streamId:'private-stream'},context:{supabase:reader(null,'unrelated')}});
    expect(state.match).toBeNull(); expect(f.calls).toEqual(['unrelated']);
  });
  it('fails closed if the policy-backed initial query fails', async () => {
    f.error={message:'denied'}; await expect(publicLoad({data:{streamId:'private-stream'}})).rejects.toThrow('Battle is unavailable');
    expect(f.calls).toEqual(['public']);
  });
});