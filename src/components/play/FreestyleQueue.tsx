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
import { confirmedFreestyleMatchups } from '@/lib/confirmed-freestyle';

type Matchup = Awaited<ReturnType<typeof getFreestyleQueue>>['challenges'][number];
type Props = { streamId?: string; hostId?: string; onSelect?: (matchup: Matchup) => void; overview?: boolean };

export function FreestyleQueue({ streamId, hostId, onSelect, overview = false }: Props) {
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
  const [selected, setSelected] = useState('');
  const state = useQuery({ queryKey: ['freestyle-queue', auth.user?.id], queryFn: () => read(), enabled: !!auth.user });
  const directory = useQuery({ queryKey: ['artists-directory'], queryFn: () => getArtistsDirectory(), enabled: !overview && state.data?.isArtist === true, staleTime: 60000 });
  useEffect(() => {
    if (!auth.user) return;
    const channel = supabase.channel(`freestyle-queue-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'freestyle_challenges' }, () => { void client.invalidateQueries({ queryKey: ['freestyle-queue'] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [auth.user?.id, client]);
  const rows = state.data?.challenges ?? [];
  const slots = confirmedFreestyleMatchups(rows);
  const mine = rows.filter(c => c.artist_a_id === auth.user?.id || c.artist_b_id === auth.user?.id);
  const canHost = state.data?.isAdmin || (state.data?.isHost && auth.user?.id === hostId);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await client.invalidateQueries({ queryKey: ['freestyle-queue'] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Please try again'); }
    finally { setBusy(false); }
  };
  const profile = (id: string) => state.data?.profiles.find(p => p.id === id);
  const slotArtist = (id: string, side: 'a' | 'b') => {
    const p = profile(id);
    const name = p?.stage_name || p?.display_name || 'Artist';
    return <Link to="/artist/$id" params={{ id }} className="fsq-artist" data-side={side}>
      <span className="fsq-ring" data-side={side}><SignedImg src={p?.avatar_url ?? undefined} alt={name} /></span>
      <span className="min-w-0"><span className="fsq-name">{name}</span><span className="fsq-genre">{p?.genre || '—'}</span></span>
    </Link>;
  };
  const artist = (id: string) => {
    const p = profile(id);
    const name = p?.stage_name || p?.display_name || 'Artist';
    return <Link to="/artist/$id" params={{ id }} className="flex min-w-0 items-center gap-2">
      <SignedImg src={p?.avatar_url ?? undefined} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
      <span className="min-w-0"><span className="block break-words text-sm font-semibold">{name}</span><span className="block text-xs text-muted-foreground">{p?.genre || '—'}</span></span>
    </Link>;
  };
  if (overview && (!auth.user || (!state.isPending && !state.isError && slots.length === 0))) return null;
  return <section aria-label="Freestyle Battle Queue" className={`min-w-0 space-y-4 py-3 text-foreground ${overview ? 'play-confirmed-battles' : ''}`}>
    <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-between"><h2 className="flex min-w-0 items-center gap-2 text-base font-bold sm:text-lg"><Swords className="h-4 w-4 shrink-0 text-primary" />{streamId ? 'Freestyle Battle Queue' : overview ? 'Confirmed Freestyle battles' : '1v1 Freestyle Battle Challenge'}</h2>{!overview && <p className="shrink-0 text-right text-xs text-muted-foreground">{state.data ? `${slots.length}/10 · ${10 - slots.length} available` : '—/10'}</p>}</header>
    {!auth.user ? <Link to="/login" className="text-primary">Sign in to view slots and challenge an artist</Link> : state.isPending ? <p className="text-muted-foreground">Loading matchups…</p> : state.isError ? <p role="alert">Could not load matchups. <Button variant="link" onClick={() => void state.refetch()}>Retry</Button></p> : <>
      <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
        {slots.map(c => {
          return <article key={c.id} className="fsq-slot min-w-0 w-full" data-state="filled">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 pt-3"><span className="fsq-slot-label">Slot {c.slot_number}</span><span className="fsq-status" data-status={c.status === 'live' ? 'live' : 'filled'}>{c.status === 'live' ? 'Live' : c.status === 'scheduled' ? 'Scheduled' : 'Accepted'}</span></div>
            <div className="px-3 pb-3 pt-3">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">{slotArtist(c.artist_a_id, 'a')}<span className="fsq-vs" aria-hidden="true">VS</span>{slotArtist(c.artist_b_id, 'b')}</div>
              {c.scheduled_at && <p className="pt-2 text-center text-xs text-muted-foreground">{new Date(c.scheduled_at).toLocaleString()}</p>}
              {streamId && canHost && c.status !== 'live' && (!c.stream_id || c.stream_id === streamId) && <div className="flex flex-wrap justify-center gap-1 pt-3">
                {onSelect && <Button size="sm" disabled={busy} onClick={() => onSelect(c)}><Play className="h-3 w-3" />Select</Button>}
                <Button size="sm" variant="outline" aria-label={`Schedule slot ${c.slot_number}`} title="Schedule battle" onClick={() => { setScheduleId(c.id); setScheduleTime(''); }}><Calendar className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" aria-label={`Cancel slot ${c.slot_number}`} title="Cancel matchup" disabled={busy} onClick={() => { if (window.confirm('Cancel this matchup?')) void act(() => control({ data: { id: c.id, action: 'cancel', streamId } })); }}><X className="h-3 w-3" /></Button>
              </div>}
            </div>
          </article>;
        })}
      </div>
      {scheduleId && streamId && <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); const date = new Date(scheduleTime); if (!Number.isFinite(date.getTime())) return; void act(async () => { await control({ data: { id: scheduleId, action: 'schedule', streamId, scheduledAt: date.toISOString() } }); setScheduleId(''); }); }}>
        <label className="text-sm">Scheduled start<Input type="datetime-local" required value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} /></label><Button disabled={busy} type="submit">Schedule battle</Button><Button type="button" variant="ghost" onClick={() => setScheduleId('')}>Cancel</Button>
      </form>}
      {!overview && mine.length > 0 && <div className="space-y-2"><h3 className="font-bold">Your freestyle matchup</h3>{mine.map(c => <div key={c.id} className="flex flex-wrap items-center gap-3 border-t border-border py-3">{artist(c.artist_a_id)}<span className="text-xs">VS</span>{artist(c.artist_b_id)}<span className="text-xs text-primary">{c.status === 'pending' ? 'Challenge Pending' : c.status}</span>
        {c.status === 'pending' && c.artist_b_id === auth.user?.id && <><Button size="sm" disabled={busy || slots.length >= 10} onClick={() => void act(() => respond({ data: { id: c.id, accept: true } }))}><Check />Accept</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => respond({ data: { id: c.id, accept: false } }))}><X />Decline</Button></>}
        {c.status !== 'live' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(() => control({ data: { id: c.id, action: 'cancel' } }))}>Cancel challenge</Button>}
      </div>)}</div>}
      {!overview && state.data?.isArtist && !streamId && <div className="space-y-3 border-t border-border pt-4"><h3 className="font-bold">Select an Artist to Battle</h3>
        {mine.length > 0 ? <p className="text-sm text-muted-foreground">Your current matchup is pending or active.</p> : slots.length >= 10 ? <p className="text-sm text-muted-foreground">All 10 slots are filled.</p> : <><Input aria-label="Search freestyle artists" placeholder="Search artists" value={search} onChange={e => setSearch(e.target.value)} />
          <div role="listbox" aria-label="Select an Artist to Battle" className="max-h-72 overflow-y-auto rounded-md border border-border">{(directory.data ?? []).filter(p => p.id !== auth.user?.id && p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 12).map(p => {
            const taken = rows.some(c => [c.artist_a_id, c.artist_b_id].includes(p.id));
            const chosen = selected === p.id;
            return <Button variant="ghost" key={p.id} type="button" role="option" aria-selected={chosen} disabled={taken} onClick={() => setSelected(chosen ? '' : p.id)} className={`h-auto w-full min-w-0 justify-start gap-2 whitespace-normal rounded-none border-b border-border px-3 py-2 text-left last:border-b-0 ${chosen ? 'bg-primary/10' : ''}`}><SignedImg src={p.avatarUrl ?? undefined} alt={p.name} className="h-10 w-10 shrink-0 rounded-full object-cover" /><span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold">{p.name}</span><span className="block text-xs text-muted-foreground">{p.genres.join(' · ')}</span></span>{taken ? <span className="text-xs text-muted-foreground">In a matchup</span> : chosen ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}</Button>;
          })}</div>
          <Button disabled={busy || !selected} onClick={() => void act(async () => { await submit({ data: { opponent: selected } }); setSelected(''); setSearch(''); })}><Swords />Send Battle Challenge</Button>
          {directory.isError && <p role="alert">Could not load artists.</p>}
        </>}
      </div>}
    </>}
  </section>;
}