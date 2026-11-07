import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Check, X, Swords, Calendar, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SignedImg } from '@/components/ui/signed-img';
import { getArtistsDirectory } from '@/lib/artists-directory.functions';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { getFreestyleQueue, submitFreestyleChallenge, respondFreestyleChallenge, controlFreestyleChallenge } from '@/lib/freestyle.functions';

type Matchup = Awaited<ReturnType<typeof getFreestyleQueue>>['challenges'][number];
type Props = { streamId?: string; hostId?: string; onSelect?: (matchup: Matchup) => void };

export function FreestyleQueue({ streamId, hostId, onSelect }: Props) {
  const auth = useAuth();
  const client = useQueryClient();
  const read = useServerFn(getFreestyleQueue);
  const submit = useServerFn(submitFreestyleChallenge);
  const respond = useServerFn(respondFreestyleChallenge);
  const control = useServerFn(controlFreestyleChallenge);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [scheduleId, setScheduleId] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const state = useQuery({ queryKey: ['freestyle-queue', auth.user?.id], queryFn: () => read(), enabled: !!auth.user });
  const directory = useQuery({ queryKey: ['artists-directory'], queryFn: () => getArtistsDirectory(), enabled: state.data?.isArtist === true, staleTime: 60000 });
  useEffect(() => {
    if (!auth.user) return;
    const channel = supabase.channel(`freestyle-queue-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'freestyle_challenges' }, () => { void client.invalidateQueries({ queryKey: ['freestyle-queue'] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [auth.user?.id, client]);
  const rows = state.data?.challenges ?? [];
  const slots = rows.filter(c => ['accepted', 'scheduled', 'live'].includes(c.status));
  const mine = rows.filter(c => c.artist_a_id === auth.user?.id || c.artist_b_id === auth.user?.id);
  const canHost = state.data?.isAdmin || (state.data?.isHost && auth.user?.id === hostId);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await client.invalidateQueries({ queryKey: ['freestyle-queue'] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Please try again'); }
    finally { setBusy(false); }
  };
  const profile = (id: string) => state.data?.profiles.find(p => p.id === id);
  const artist = (id: string) => {
    const p = profile(id);
    const name = p?.stage_name || p?.display_name || 'Artist';
    return <Link to="/artist/$id" params={{ id }} className="flex min-w-0 items-center gap-2">
      <SignedImg src={p?.avatar_url ?? undefined} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
      <span className="min-w-0"><span className="block break-words text-sm font-semibold">{name}</span><span className="block text-xs text-muted-foreground">{p?.genre || '—'}</span></span>
    </Link>;
  };
  return <section aria-label="Freestyle Battle Queue" className="space-y-4 border-y border-border py-5 text-foreground">
    <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-xl font-bold"><Swords className="text-primary" />{streamId ? 'Freestyle Battle Queue' : '1v1 Freestyle Battle Challenge'}</h2><p className="text-sm font-semibold">{state.data ? `${slots.length}/10 · ${10 - slots.length} available` : '—/10'}</p></header>
    {!auth.user ? <Link to="/login" className="text-primary">Sign in to view slots and challenge an artist</Link> : state.isPending ? <p className="text-muted-foreground">Loading matchups…</p> : state.isError ? <p role="alert">Could not load matchups. <Button variant="link" onClick={() => void state.refetch()}>Retry</Button></p> : <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => {
          const c = slots.find(c => c.slot_number === i + 1);
          return <article key={i} className="min-w-0 rounded-md border border-border bg-card p-3">
            <div className="mb-3 flex justify-between gap-2 text-xs"><span className="font-bold">Slot {i + 1}</span><span className={c ? 'text-primary' : 'text-muted-foreground'}>{c?.status === 'live' ? 'Live' : c?.status === 'scheduled' ? 'Scheduled' : c ? 'Accepted' : 'Open'}</span></div>
            {c ? <div className="space-y-2">{artist(c.artist_a_id)}<p className="text-center text-xs font-bold text-muted-foreground">VS</p>{artist(c.artist_b_id)}
              {c.scheduled_at && <p className="text-xs text-muted-foreground">{new Date(c.scheduled_at).toLocaleString()}</p>}
              {streamId && canHost && c.status !== 'live' && (!c.stream_id || c.stream_id === streamId) && <div className="flex flex-wrap gap-1 pt-2">
                {onSelect && <Button size="sm" disabled={busy} onClick={() => onSelect(c)}><Play className="h-3 w-3" />Select</Button>}
                <Button size="sm" variant="outline" aria-label={`Schedule slot ${i + 1}`} title="Schedule battle" onClick={() => { setScheduleId(c.id); setScheduleTime(''); }}><Calendar className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" aria-label={`Cancel slot ${i + 1}`} title="Cancel matchup" disabled={busy} onClick={() => { if (window.confirm('Cancel this matchup?')) void act(() => control({ data: { id: c.id, action: 'cancel', streamId } })); }}><X className="h-3 w-3" /></Button>
              </div>}
            </div> : <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">Open</div>}
          </article>;
        })}
      </div>
      {scheduleId && streamId && <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); const date = new Date(scheduleTime); if (!Number.isFinite(date.getTime())) return; void act(async () => { await control({ data: { id: scheduleId, action: 'schedule', streamId, scheduledAt: date.toISOString() } }); setScheduleId(''); }); }}>
        <label className="text-sm">Scheduled start<Input type="datetime-local" required value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} /></label><Button disabled={busy} type="submit">Schedule battle</Button><Button type="button" variant="ghost" onClick={() => setScheduleId('')}>Cancel</Button>
      </form>}
      {mine.length > 0 && <div className="space-y-2"><h3 className="font-bold">Your freestyle matchup</h3>{mine.map(c => <div key={c.id} className="flex flex-wrap items-center gap-3 border-t border-border py-3">{artist(c.artist_a_id)}<span className="text-xs">VS</span>{artist(c.artist_b_id)}<span className="text-xs text-primary">{c.status === 'pending' ? 'Challenge Pending' : c.status}</span>
        {c.status === 'pending' && c.artist_b_id === auth.user?.id && <><Button size="sm" disabled={busy || slots.length >= 10} onClick={() => void act(() => respond({ data: { id: c.id, accept: true } }))}><Check />Accept</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => respond({ data: { id: c.id, accept: false } }))}><X />Decline</Button></>}
        {c.status !== 'live' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(() => control({ data: { id: c.id, action: 'cancel' } }))}>Cancel challenge</Button>}
      </div>)}</div>}
      {state.data?.isArtist && !streamId && <div className="space-y-3 border-t border-border pt-4"><h3 className="font-bold">Select Your Freestyle Opponent</h3>
        {mine.length > 0 ? <p className="text-sm text-muted-foreground">Your current matchup is pending or active.</p> : slots.length >= 10 ? <p className="text-sm text-muted-foreground">All 10 slots are filled.</p> : <><Input aria-label="Search freestyle artists" placeholder="Search artists" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(directory.data ?? []).filter(p => p.id !== auth.user?.id && p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 12).map(p => <div key={p.id} className="flex min-w-0 items-center gap-2 border-b border-border py-2"><SignedImg src={p.avatarUrl ?? undefined} alt={p.name} className="h-10 w-10 shrink-0 rounded-full object-cover" /><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{p.name}</p><p className="text-xs text-muted-foreground">{p.genres.join(' · ')}</p></div><Button size="sm" disabled={busy || rows.some(c => [c.artist_a_id, c.artist_b_id].includes(p.id))} onClick={() => void act(() => submit({ data: { opponent: p.id } }))}>Challenge</Button></div>)}</div>
          {directory.isError && <p role="alert">Could not load artists.</p>}
        </>}
      </div>}
    </>}
  </section>;
}